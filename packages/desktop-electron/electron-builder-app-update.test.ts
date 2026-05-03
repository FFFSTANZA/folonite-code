import { afterEach, describe, expect, test } from "bun:test"
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import type { Configuration } from "electron-builder"
import { createConfig, getPublishConfig } from "./electron-builder.config"
import { serializeAppUpdateConfig } from "./scripts/write-app-update-config"

const roots: string[] = []
type AfterPackContext = Parameters<Extract<NonNullable<Configuration["afterPack"]>, (...args: any[]) => unknown>>[0]

function macAfterPackContext(
  appOutDir: string,
  appBundleName: string,
  electronPlatformName = "darwin",
): AfterPackContext {
  return {
    appOutDir,
    electronPlatformName,
    packager: {
      getMacOsResourcesDir: (root: string) => join(root, `${appBundleName}.app`, "Contents", "Resources"),
    },
  } as AfterPackContext
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
})

describe("electron builder app-update config", () => {
  test("prod publish config feeds local updater config", () => {
    expect(serializeAppUpdateConfig(getPublishConfig("prod")!)).toContain("repo: folonite-code\n")
  })

  test("beta publish config feeds local updater config", () => {
    expect(serializeAppUpdateConfig(getPublishConfig("beta")!)).toContain("repo: folonite-code-beta\n")
  })

  test("dev does not publish updater config", () => {
    expect(getPublishConfig("dev")).toBeUndefined()
  })

  test("mac packaging has an afterPack hook to write app-update.yml before signing", () => {
    expect(typeof createConfig("prod").afterPack).toBe("function")
  })

  test("mac packaging enables a localized display name", () => {
    const config = createConfig("prod")
    expect(config.productName).toBe("Folonite")
    expect(config.appId).toBe("ai.folonite-code.desktop")
    expect(config.artifactName).toBe("folonite-code-${os}-${arch}-${version}.${ext}")
    expect(config.publish).toMatchObject({ owner: "fffstanza", repo: "folonite-code" })
    expect(createConfig("prod").mac?.extendInfo).toMatchObject({
      LSHasLocalizedDisplayName: true,
    })
  })

  test("all channels share the versioned artifact name", () => {
    expect(createConfig("dev").artifactName).toBe("folonite-code-${os}-${arch}-${version}.${ext}")
    expect(createConfig("beta").artifactName).toBe("folonite-code-${os}-${arch}-${version}.${ext}")
    expect(createConfig("prod").artifactName).toBe("folonite-code-${os}-${arch}-${version}.${ext}")
  })

  test("packages third-party notices into app resources", () => {
    const config = createConfig("prod")
    expect(config.extraResources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          from: expect.stringContaining("THIRD_PARTY_NOTICES.md"),
          to: "THIRD_PARTY_NOTICES.md",
        }),
      ]),
    )
  })

  test("afterPack writes app-update.yml to the packager-reported macOS resources path", async () => {
    const root = mkdtempSync(join(tmpdir(), "folonite-code-builder-config-"))
    roots.push(root)
    const config = createConfig("prod")

    await config.afterPack!(macAfterPackContext(root, "Folonite Product Filename"))

    const configPath = join(root, "Folonite Product Filename.app", "Contents", "Resources", "app-update.yml")
    expect(existsSync(configPath)).toBe(true)
    expect(readFileSync(configPath, "utf8")).toContain("repo: folonite-code\n")
  })

  test("afterPack writes localized macOS display names to the final resources path", async () => {
    const root = mkdtempSync(join(tmpdir(), "folonite-code-builder-config-"))
    roots.push(root)
    const config = createConfig("prod")

    await config.afterPack!(macAfterPackContext(root, "Folonite"))

    const zhHans = join(root, "Folonite.app", "Contents", "Resources", "zh-Hans.lproj", "InfoPlist.strings")
    const zhCn = join(root, "Folonite.app", "Contents", "Resources", "zh_CN.lproj", "InfoPlist.strings")

    expect(existsSync(zhHans)).toBe(true)
    expect(existsSync(zhCn)).toBe(true)
    expect(readFileSync(zhHans, "utf8")).toContain('CFBundleDisplayName = "爪印";')
    expect(readFileSync(zhHans, "utf8")).toContain('CFBundleName = "爪印";')
    expect(readFileSync(zhCn, "utf8")).toContain('CFBundleDisplayName = "爪印";')
    expect(readFileSync(zhCn, "utf8")).toContain('CFBundleName = "爪印";')
  })

  test("afterPack writes beta app-update.yml to the beta app resources path", async () => {
    const root = mkdtempSync(join(tmpdir(), "folonite-code-builder-config-"))
    roots.push(root)
    const config = createConfig("beta")

    await config.afterPack!(macAfterPackContext(root, "Folonite Beta"))

    const configPath = join(root, "Folonite Beta.app", "Contents", "Resources", "app-update.yml")
    expect(existsSync(configPath)).toBe(true)
    expect(readFileSync(configPath, "utf8")).toContain("repo: folonite-code-beta\n")
  })

  test("afterPack preserves an existing hook before writing updater config", async () => {
    const root = mkdtempSync(join(tmpdir(), "folonite-code-builder-config-"))
    roots.push(root)
    const calls: string[] = []
    const config = createConfig("prod", {
      afterPack: async () => {
        calls.push("existing")
      },
    })

    await config.afterPack!(macAfterPackContext(root, "Folonite"))

    const configPath = join(root, "Folonite.app", "Contents", "Resources", "app-update.yml")
    expect(calls).toEqual(["existing"])
    expect(existsSync(configPath)).toBe(true)
  })

  test("afterPack skips updater config when publish is not configured", async () => {
    const root = mkdtempSync(join(tmpdir(), "folonite-code-builder-config-"))
    roots.push(root)
    const config = createConfig("dev")

    await config.afterPack!(macAfterPackContext(root, "Folonite Dev"))

    const configPath = join(root, "Folonite Dev.app", "Contents", "Resources", "app-update.yml")
    expect(existsSync(configPath)).toBe(false)
  })
})
