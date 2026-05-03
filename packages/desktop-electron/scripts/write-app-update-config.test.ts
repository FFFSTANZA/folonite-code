import { afterEach, describe, expect, test } from "bun:test"
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { UPDATER_CACHE_DIR_NAME } from "../src/main/updater-cache"
import { serializeAppUpdateConfig, writeAppUpdateConfig } from "./write-app-update-config"

const roots: string[] = []

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
})

describe("write-app-update-config", () => {
  test("serializes prod GitHub updater config", () => {
    expect(
      serializeAppUpdateConfig({
        provider: "github",
        owner: "fffstanza",
        repo: "folonite",
        channel: "latest",
      }),
    ).toBe(
      [
        "provider: github",
        "owner: fffstanza",
        "repo: folonite",
        "channel: latest",
        `updaterCacheDirName: ${UPDATER_CACHE_DIR_NAME}`,
        "",
      ].join("\n"),
    )
  })

  test("serializes updater cache dir from the shared constant", () => {
    expect(
      serializeAppUpdateConfig({
        provider: "github",
        owner: "fffstanza",
        repo: "folonite",
        channel: "latest",
      }),
    ).toContain(`updaterCacheDirName: ${UPDATER_CACHE_DIR_NAME}`)
  })

  test("serializes beta GitHub updater config", () => {
    expect(
      serializeAppUpdateConfig({
        provider: "github",
        owner: "fffstanza",
        repo: "folonite-beta",
        channel: "latest",
      }),
    ).toContain("repo: folonite-beta")
  })

  test("does not write updater config without publish config", async () => {
    const root = mkdtempSync(join(tmpdir(), "folonite-app-update-"))
    roots.push(root)

    expect(await writeAppUpdateConfig(join(root, "Resources"), undefined)).toBe(false)
    expect(existsSync(join(root, "Resources", "app-update.yml"))).toBe(false)
  })

  test("writes updater config inside macOS app resources", async () => {
    const root = mkdtempSync(join(tmpdir(), "folonite-app-update-"))
    roots.push(root)

    expect(
      await writeAppUpdateConfig(join(root, "Folonite.app", "Contents", "Resources"), {
        provider: "github",
        owner: "fffstanza",
        repo: "folonite",
        channel: "latest",
      }),
    ).toBe(true)

    const configPath = join(root, "Folonite.app", "Contents", "Resources", "app-update.yml")
    const config = readFileSync(configPath, "utf8")
    expect(config).toContain("repo: folonite")
    expect(config).toContain(`updaterCacheDirName: ${UPDATER_CACHE_DIR_NAME}`)
  })
})
