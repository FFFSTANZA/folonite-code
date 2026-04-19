import { lazy } from "@/util/lazy"
import type { ProjectID } from "@/project/schema"
import type { Adaptor } from "../types"

const BUILTIN: Record<string, () => Promise<Adaptor>> = {
  worktree: lazy(async () => (await import("./worktree")).WorktreeAdaptor),
}

type CustomAdaptor = {
  adaptor: Adaptor
  refs: number
}

const CUSTOM = new Map<ProjectID, Map<string, CustomAdaptor>>()

export async function getAdaptor(projectID: ProjectID, type: string): Promise<Adaptor> {
  const custom = CUSTOM.get(projectID)?.get(type)
  if (custom) return custom.adaptor

  const builtin = BUILTIN[type]
  if (builtin) return builtin()

  throw new Error(`Unknown workspace adaptor: ${type}`)
}

export function installAdaptor(projectID: ProjectID, type: string, adaptor: Adaptor) {
  // This is experimental: mostly used for testing right now, but we
  // will likely allow this in the future. Need to figure out the
  // TypeScript story

  const project = CUSTOM.get(projectID) ?? new Map<string, CustomAdaptor>()
  const current = project.get(type)
  project.set(type, {
    adaptor,
    refs: (current?.refs ?? 0) + 1,
  })
  CUSTOM.set(projectID, project)
}

export function uninstallAdaptor(projectID: ProjectID, type: string) {
  const project = CUSTOM.get(projectID)
  if (!project) return

  const current = project.get(type)
  if (!current) return

  if (current.refs > 1) {
    project.set(type, {
      adaptor: current.adaptor,
      refs: current.refs - 1,
    })
    return
  }

  project.delete(type)
  if (project.size === 0) CUSTOM.delete(projectID)
}
