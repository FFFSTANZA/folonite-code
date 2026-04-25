import os from "node:os"
import path from "node:path"
import fs from "node:fs/promises"
import crypto from "node:crypto"
import { Effect } from "effect"
import { Runtime } from "@opencode-ai/shared/runtime"
import { Session } from "."
import type { SessionID } from "./schema"
import type { MessageV2 } from "./message-v2"
import type { Snapshot as SnapshotMod } from "../snapshot"
import { Installation } from "../installation"
import { Provider } from "../provider/provider"
import { ProviderID, ModelID } from "../provider/schema"
import { Instance } from "../project/instance"
import { Global } from "../global"

export function getRuntimeNamespace(): "pawwork" | "opencode" {
  return Runtime.isPawWork() ? "pawwork" : "opencode"
}

async function hashFile(p: string) {
  try {
    const buf = await fs.readFile(p)
    return "sha256:" + crypto.createHash("sha256").update(buf).digest("hex")
  } catch {
    return undefined
  }
}

function redactDataUrl(url: string): { mime: string; size_bytes: number; sha256: string } | null {
  const match = /^data:([^;,]+)(;base64)?,(.*)$/s.exec(url)
  if (!match) return null
  const [, mime, isBase64, payload] = match
  const buf = isBase64 ? Buffer.from(payload, "base64") : Buffer.from(payload, "utf8")
  return {
    mime,
    size_bytes: buf.byteLength,
    sha256: "sha256:" + crypto.createHash("sha256").update(buf).digest("hex"),
  }
}

export function redactPart(
  part: MessageV2.Part,
  ctx: { count: { omitted: number } },
): MessageV2.Part {
  if (part.type === "file") {
    const r = redactDataUrl(part.url)
    if (!r) return part
    ctx.count.omitted++
    return {
      ...part,
      url: "",
      metadata: { ...(part.metadata ?? {}), redacted_binary: r },
    }
  }
  if (part.type === "tool" && part.state.status === "completed" && part.state.attachments) {
    let mutated = false
    const attachments = part.state.attachments.map((a) => {
      const r = redactDataUrl(a.url)
      if (!r) return a
      mutated = true
      ctx.count.omitted++
      return { ...a, url: "", metadata: { ...(a.metadata ?? {}), redacted_binary: r } }
    })
    return mutated ? { ...part, state: { ...part.state, attachments } } : part
  }
  return part
}

function extractReasonFromCause(cause: unknown): string {
  // Cause shape in Effect 4.x: { reasons: Array<{ _tag, error?, defect?, ... }> }
  // We only need a reason string for diagnostics — best-effort extraction without depending
  // on a stable Cause API surface (Cause.failureOption was removed in this version).
  const reasons = (cause as { reasons?: unknown[] } | undefined)?.reasons ?? []
  for (const r of reasons as Array<{ _tag?: string; error?: unknown; defect?: unknown }>) {
    const payload = r.error ?? r.defect
    if (typeof payload === "string") return payload
    const p = payload as { _tag?: string; message?: string } | undefined
    if (p?.message) return p.message
    if (p?._tag) return p._tag
  }
  return "unknown"
}

export namespace Export {
  export type Tree = {
    info: Omit<Session.Info, "share">
    had_cloud_share: boolean
    diffs: SnapshotMod.FileDiff[]
    messages: MessageV2.WithParts[]
    children: Tree[]
  }

  export type ModelRefEntry =
    | { providerID: string; modelID: string; resolved: true }
    | { providerID: string; modelID: string; resolved: false; unresolved_reason: string }

  export type InstructionSource = {
    kind: string
    path?: string
    url?: string
    hash?: string
    hash_unavailable?: true
  }

  export type Snapshot = {
    schema_version: 1
    format: "pawwork-session-export"
    exported_at: number
    root_session_id: SessionID
    runtime_context: {
      app_version: string
      build_channel?: string
      runtime_namespace: "pawwork" | "opencode"
      platform: NodeJS.Platform
      os_version: string
      locale: string
      timezone: string
      instruction_sources: InstructionSource[]
      model_refs: Record<string, ModelRefEntry>
      stats: {
        session_count: number
        message_count: number
        part_count: number
        omitted_attachment_count: number
      }
    }
    diagnostics: Record<string, never>
    session: Tree
  }

  type NodeData = {
    node: Tree
    childInfos: Session.Info[]
  }

  const climbToRoot = Effect.fn("Export.climbToRoot")(function* (svc: Session.Interface, id: SessionID) {
    let current: Session.Info = yield* svc.get(id)
    while (current.parentID) {
      current = yield* svc.get(current.parentID)
    }
    return current
  })

  const buildNode = Effect.fn("Export.buildNode")(function* (
    svc: Session.Interface,
    info: Session.Info,
    ctx: { count: { omitted: number } },
  ) {
    const messages = yield* svc.messages({ sessionID: info.id })
    const diffs = yield* svc.diff(info.id)
    const children = yield* svc.children(info.id)
    const sorted = [...children].sort((a, b) => {
      if (a.time.created !== b.time.created) return a.time.created - b.time.created
      return a.id.localeCompare(b.id)
    })
    const { share, ...infoWithoutShare } = info as Session.Info & { share?: unknown }
    const redactedMessages = messages.map((m) => ({ ...m, parts: m.parts.map((p) => redactPart(p, ctx)) }))
    const node: Tree = {
      info: infoWithoutShare as Omit<Session.Info, "share">,
      had_cloud_share: !!(share as { url?: string } | undefined)?.url,
      diffs,
      messages: redactedMessages,
      children: [],
    }
    const data: NodeData = { node, childInfos: sorted }
    return data
  })

  const exportTree = Effect.fn("Export.exportTree")(function* (
    svc: Session.Interface,
    root: Session.Info,
    ctx: { count: { omitted: number } },
  ) {
    const rootData = yield* buildNode(svc, root, ctx)
    const queue: NodeData[] = [rootData]
    let head = 0
    while (head < queue.length) {
      const cur = queue[head++]
      for (const childInfo of cur.childInfos) {
        const childData = yield* buildNode(svc, childInfo, ctx)
        cur.node.children.push(childData.node)
        queue.push(childData)
      }
    }
    return rootData.node
  })

  function countStats(tree: Tree, omitted_attachment_count: number) {
    let session_count = 0
    let message_count = 0
    let part_count = 0
    function walk(node: Tree) {
      session_count++
      message_count += node.messages.length
      for (const m of node.messages) part_count += m.parts.length
      for (const c of node.children) walk(c)
    }
    walk(tree)
    return { session_count, message_count, part_count, omitted_attachment_count }
  }

  const collectInstructionSources = Effect.fn("Export.instructionSources")(function* () {
    const sources: InstructionSource[] = []
    let worktree: string | undefined
    try {
      worktree = Instance.worktree
    } catch {
      worktree = undefined
    }
    const candidates: Array<{ kind: string; file: string }> = [
      { kind: "global", file: path.join(Global.Path.config, "AGENTS.md") },
      ...(worktree ? [{ kind: "project", file: path.join(worktree, "AGENTS.md") }] : []),
      // Bundled pawwork prompt — present in the repo at packages/opencode/src/session/prompt/pawwork.txt.
      // hashFile silently returns undefined and the entry is skipped if the file is missing.
      { kind: "bundled", file: path.join(__dirname, "prompt", "pawwork.txt") },
    ]
    for (const c of candidates) {
      const hash = yield* Effect.promise(() => hashFile(c.file))
      if (hash) sources.push({ kind: c.kind, path: c.file, hash })
    }
    return sources.sort((a, b) => {
      if (a.kind !== b.kind) return a.kind.localeCompare(b.kind)
      return (a.path ?? a.url ?? "").localeCompare(b.path ?? b.url ?? "")
    })
  })

  // Exported so it can be unit-tested with synthesized Tree fixtures.
  export const collectModelRefs = Effect.fn("Export.modelRefs")(function* (tree: Tree) {
    const provider = yield* Provider.Service
    const seen = new Map<string, { providerID: string; modelID: string }>()
    function walk(node: Tree) {
      for (const m of node.messages) {
        if (m.info.role !== "user") continue
        const ref = m.info.model
        const key = `${ref.providerID}/${ref.modelID}`
        if (!seen.has(key)) seen.set(key, { providerID: ref.providerID, modelID: ref.modelID })
      }
      for (const c of node.children) walk(c)
    }
    walk(tree)
    const refs: Record<string, ModelRefEntry> = {}
    for (const [key, ref] of [...seen.entries()].sort(([a], [b]) => a.localeCompare(b))) {
      const entry = yield* Effect.matchCause(
        provider.getModel(ProviderID.make(ref.providerID), ModelID.make(ref.modelID)),
        {
          onSuccess: (): ModelRefEntry => ({
            providerID: ref.providerID,
            modelID: ref.modelID,
            resolved: true,
          }),
          onFailure: (cause): ModelRefEntry => {
            // The provider throws ModelNotFoundError inside Effect.gen → arrives as a defect.
            // matchCause handles both typed failures and defects; reach into cause.reasons to extract.
            const reason = extractReasonFromCause(cause)
            return {
              providerID: ref.providerID,
              modelID: ref.modelID,
              resolved: false,
              unresolved_reason: reason,
            }
          },
        },
      )
      refs[key] = entry
    }
    return refs
  })

  export const session = Effect.fn("Export.session")(function* (anyID: SessionID) {
    const svc = yield* Session.Service
    const root = yield* climbToRoot(svc, anyID)
    const ctx = { count: { omitted: 0 } }
    const tree = yield* exportTree(svc, root, ctx)
    const instruction_sources = yield* collectInstructionSources()
    const model_refs = yield* collectModelRefs(tree)
    return {
      schema_version: 1 as const,
      format: "pawwork-session-export" as const,
      exported_at: Date.now(),
      root_session_id: root.id,
      runtime_context: {
        app_version: Installation.VERSION,
        ...(Installation.CHANNEL ? { build_channel: Installation.CHANNEL } : {}),
        runtime_namespace: getRuntimeNamespace(),
        platform: process.platform,
        os_version: os.release(),
        locale: Intl.DateTimeFormat().resolvedOptions().locale,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        instruction_sources,
        model_refs,
        stats: countStats(tree, ctx.count.omitted),
      },
      diagnostics: {},
      session: tree,
    } satisfies Snapshot
  })
}
