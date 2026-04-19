import z from "zod"
import { setTimeout as sleep } from "node:timers/promises"
import { fn } from "@/util/fn"
import { Database, eq } from "@/storage/db"
import { Project } from "@/project/project"
import { BusEvent } from "@/bus/bus-event"
import { GlobalBus } from "@/bus/global"
import { SyncEvent } from "@/sync"
import { Log } from "@/util/log"
import { Filesystem } from "@/util/filesystem"
import { ProjectID } from "@/project/schema"
import { Instance } from "@/project/instance"
import { InstanceBootstrap } from "@/project/bootstrap"
import { WorkspaceTable } from "./workspace.sql"
import { getAdaptor } from "./adaptors"
import { WorkspaceInfo } from "./types"
import { WorkspaceID } from "./schema"
import { parseSSE } from "./sse"

export namespace Workspace {
  export const Info = WorkspaceInfo.meta({
    ref: "Workspace",
  })
  export type Info = z.infer<typeof Info>
  type StoredInfo = Info & {
    owner: string | null
  }

  export const ConnectionStatus = z.object({
    workspaceID: WorkspaceID.zod,
    status: z.enum(["connected", "connecting", "disconnected", "error"]),
    error: z.string().optional(),
  })
  export type ConnectionStatus = z.infer<typeof ConnectionStatus>

  export const Event = {
    Ready: BusEvent.define(
      "workspace.ready",
      z.object({
        name: z.string(),
      }),
    ),
    Failed: BusEvent.define(
      "workspace.failed",
      z.object({
        message: z.string(),
      }),
    ),
    Status: BusEvent.define("workspace.status", ConnectionStatus),
  }

  function fromRow(row: typeof WorkspaceTable.$inferSelect): StoredInfo {
    return {
      id: row.id,
      type: row.type,
      branch: row.branch,
      name: row.name,
      directory: row.directory,
      owner: row.owner_directory,
      extra: row.extra,
      projectID: row.project_id,
    }
  }

  function toInfo(row: StoredInfo): Info {
    return {
      id: row.id,
      type: row.type,
      branch: row.branch,
      name: row.name,
      directory: row.directory,
      extra: row.extra,
      projectID: row.projectID,
    }
  }

  const CreateInput = z.object({
    id: WorkspaceID.zod.optional(),
    type: Info.shape.type,
    branch: Info.shape.branch,
    projectID: ProjectID.zod,
    extra: Info.shape.extra,
  })

  async function bootstrapAdaptor(input: Pick<StoredInfo, "projectID" | "type" | "owner">, error: unknown) {
    const project = Project.get(input.projectID)
    if (!project) throw error

    const candidates = [
      ...new Set(
        [input.owner, project.worktree, ...project.sandboxes].filter((value): value is string => Boolean(value)),
      ),
    ]
    let lastError = error

    for (const directory of candidates) {
      try {
        return await Instance.provide({
          directory,
          init: InstanceBootstrap,
          fn: () => getAdaptor(input.projectID, input.type, directory),
        })
      } catch (candidateError) {
        lastError = candidateError
      }
    }

    throw lastError
  }

  export async function resolveAdaptor(input: Pick<StoredInfo, "projectID" | "type" | "owner">) {
    try {
      return await getAdaptor(input.projectID, input.type, input.owner ?? undefined)
    } catch (error) {
      return bootstrapAdaptor(input, error)
    }
  }

  export const create = fn(CreateInput, async (input) => {
    const id = WorkspaceID.ascending(input.id)
    const owner = Instance.directory
    const adaptor = await getAdaptor(input.projectID, input.type, owner)

    const config = await adaptor.configure({ ...input, id, name: null, directory: null })

    const info: StoredInfo = {
      id,
      type: config.type,
      branch: config.branch ?? null,
      name: config.name ?? null,
      directory: config.directory ?? null,
      owner,
      extra: config.extra ?? null,
      projectID: input.projectID,
    }

    Database.use((db) => {
      db.insert(WorkspaceTable)
        .values({
          id: info.id,
          type: info.type,
          branch: info.branch,
          name: info.name,
          directory: info.directory,
          owner_directory: info.owner,
          extra: info.extra,
          project_id: info.projectID,
        })
        .run()
    })

    await adaptor.create(config)

    startSync(info)

    return toInfo(info)
  })

  export function list(project: Project.Info) {
    const rows = Database.use((db) =>
      db.select().from(WorkspaceTable).where(eq(WorkspaceTable.project_id, project.id)).all(),
    )
    const spaces = rows.map(fromRow).sort((a, b) => a.id.localeCompare(b.id))
    for (const space of spaces) startSync(space)
    return spaces.map(toInfo)
  }

  export const record = fn(WorkspaceID.zod, async (id) => {
    const row = Database.use((db) => db.select().from(WorkspaceTable).where(eq(WorkspaceTable.id, id)).get())
    if (!row) return
    return fromRow(row)
  })

  export const get = fn(WorkspaceID.zod, async (id) => {
    const space = await record(id)
    if (!space) return
    startSync(space)
    return toInfo(space)
  })

  export const remove = fn(WorkspaceID.zod, async (id) => {
    const info = await record(id)
    if (info) {
      stopSync(id)

      const adaptor = await resolveAdaptor(info)
      adaptor.remove(info)
      Database.use((db) => db.delete(WorkspaceTable).where(eq(WorkspaceTable.id, id)).run())
      return toInfo(info)
    }
  })

  const connections = new Map<WorkspaceID, ConnectionStatus>()
  const aborts = new Map<WorkspaceID, AbortController>()

  function setStatus(id: WorkspaceID, status: ConnectionStatus["status"], error?: string) {
    const prev = connections.get(id)
    if (prev?.status === status && prev?.error === error) return
    const next = { workspaceID: id, status, error }
    connections.set(id, next)
    GlobalBus.emit("event", {
      directory: "global",
      workspace: id,
      payload: {
        type: Event.Status.type,
        properties: next,
      },
    })
  }

  export function status(): ConnectionStatus[] {
    return [...connections.values()]
  }

  const log = Log.create({ service: "workspace-sync" })

  async function workspaceEventLoop(space: StoredInfo, signal: AbortSignal) {
    log.info("starting sync: " + space.id)

    while (!signal.aborted) {
      log.info("connecting to sync: " + space.id)

      setStatus(space.id, "connecting")
      const adaptor = await resolveAdaptor(space)
      const target = await adaptor.target(space)

      if (target.type === "local") return

      const res = await fetch(target.url + "/sync/event", { method: "GET", signal }).catch((err: unknown) => {
        setStatus(space.id, "error", String(err))
        return undefined
      })
      if (!res || !res.ok || !res.body) {
        log.info("failed to connect to sync: " + res?.status)

        setStatus(space.id, "error", res ? `HTTP ${res.status}` : "no response")
        await sleep(1000)
        continue
      }
      setStatus(space.id, "connected")
      await parseSSE(res.body, signal, (evt) => {
        const event = evt as SyncEvent.SerializedEvent

        try {
          if (!event.type.startsWith("server.")) {
            SyncEvent.replay(event)
          }
        } catch (err) {
          log.warn("failed to replay sync event", {
            workspaceID: space.id,
            error: err,
          })
        }
      })
      setStatus(space.id, "disconnected")
      log.info("disconnected to sync: " + space.id)
      await sleep(250)
    }
  }

  function startSync(space: StoredInfo) {
    if (space.type === "worktree") {
      void Filesystem.exists(space.directory!).then((exists) => {
        setStatus(space.id, exists ? "connected" : "error", exists ? undefined : "directory does not exist")
      })
      return
    }

    if (aborts.has(space.id)) return
    const abort = new AbortController()
    aborts.set(space.id, abort)
    setStatus(space.id, "disconnected")

    void workspaceEventLoop(space, abort.signal).catch((error) => {
      aborts.delete(space.id)
      setStatus(space.id, "error", String(error))
      log.warn("workspace sync listener failed", {
        workspaceID: space.id,
        error,
      })
    })
  }

  function stopSync(id: WorkspaceID) {
    aborts.get(id)?.abort()
    aborts.delete(id)
    connections.delete(id)
  }
}
