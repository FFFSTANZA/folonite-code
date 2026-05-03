import { join } from "node:path"

export const FOLONITE_RUNTIME = {
  client: "desktop",
  serverUsername: "Folonite",
  settingsStore: "folonite.settings",
  databaseName: "folonite.db",
} as const

export function runtimeRoots(userData: string) {
  return {
    data: join(userData, "data"),
    cache: join(userData, "cache"),
    config: join(userData, "config"),
    state: join(userData, "state"),
  }
}

export function databasePathForUserData(userData: string) {
  return join(runtimeRoots(userData).data, "folonite", FOLONITE_RUNTIME.databaseName)
}
