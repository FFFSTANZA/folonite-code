import { Effect } from "effect"
import { Runtime } from "@opencode-ai/shared/runtime"
import { Session } from "."
import type { SessionID } from "./schema"
import type { MessageV2 } from "./message-v2"
import type { Snapshot as SnapshotMod } from "../snapshot"

export function getRuntimeNamespace(): "pawwork" | "opencode" {
  return Runtime.isPawWork() ? "pawwork" : "opencode"
}

export namespace Export {
  export type Tree = {
    info: Omit<Session.Info, "share">
    had_cloud_share: boolean
    diffs: SnapshotMod.FileDiff[]
    messages: MessageV2.WithParts[]
    children: Tree[]
  }

  export type Snapshot = {
    schema_version: 1
    format: "pawwork-session-export"
    exported_at: number
    root_session_id: SessionID
    runtime_context: {
      runtime_namespace: "pawwork" | "opencode"
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

  export const session = Effect.fn("Export.session")(function* (rootID: SessionID) {
    const sessionSvc = yield* Session.Service
    const info = yield* sessionSvc.get(rootID)
    const messages = yield* sessionSvc.messages({ sessionID: rootID })
    const diffs = yield* sessionSvc.diff(rootID)

    const { share, ...infoWithoutShare } = info as Session.Info & { share?: unknown }

    return {
      schema_version: 1 as const,
      format: "pawwork-session-export" as const,
      exported_at: Date.now(),
      root_session_id: info.id,
      runtime_context: {
        runtime_namespace: getRuntimeNamespace(),
        stats: {
          session_count: 1,
          message_count: messages.length,
          part_count: messages.reduce((acc, m) => acc + m.parts.length, 0),
          omitted_attachment_count: 0,
        },
      },
      diagnostics: {},
      session: {
        info: infoWithoutShare as Omit<Session.Info, "share">,
        had_cloud_share: !!(share as { url?: string } | undefined)?.url,
        diffs,
        messages,
        children: [] as Tree[],
      },
    } satisfies Snapshot
  })
}
