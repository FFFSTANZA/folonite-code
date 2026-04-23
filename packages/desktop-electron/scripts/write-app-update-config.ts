import { mkdir, writeFile } from "node:fs/promises"
import { join } from "node:path"

import { UPDATER_CACHE_DIR_NAME } from "../src/main/updater-cache"

export type GitHubPublishConfig = {
  provider: "github"
  owner: string
  repo: string
  channel: string
}

export function serializeAppUpdateConfig(publish: GitHubPublishConfig) {
  return [
    "provider: github",
    `owner: ${publish.owner}`,
    `repo: ${publish.repo}`,
    `channel: ${publish.channel}`,
    `updaterCacheDirName: ${UPDATER_CACHE_DIR_NAME}`,
    "",
  ].join("\n")
}

export async function writeAppUpdateConfig(resourcesDir: string, publish: GitHubPublishConfig | undefined) {
  if (publish === undefined) return false

  await mkdir(resourcesDir, { recursive: true })
  await writeFile(join(resourcesDir, "app-update.yml"), serializeAppUpdateConfig(publish))
  return true
}
