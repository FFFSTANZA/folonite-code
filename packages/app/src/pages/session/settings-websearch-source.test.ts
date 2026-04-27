import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"

const settingsSource = readFileSync(new URL("../../context/settings.tsx", import.meta.url), "utf8")
const generalSource = readFileSync(new URL("../../components/settings-general.tsx", import.meta.url), "utf8")
const appSource = readFileSync(new URL("../../app.tsx", import.meta.url), "utf8")
const enSource = readFileSync(new URL("../../i18n/en.ts", import.meta.url), "utf8")
const zhSource = readFileSync(new URL("../../i18n/zh.ts", import.meta.url), "utf8")

describe("settings web search source contract", () => {
  test("defaults Web Search on and mirrors the persisted toggle to Electron main", () => {
    expect(settingsSource).toContain("webSearchEnabled: true")
    expect(settingsSource).toContain("setWebSearchEnabled")
    expect(settingsSource).toContain("window.api?.setWebSearchEnabled")
    expect(appSource).toContain("setWebSearchEnabled?: (value: boolean) => Promise<void>")
  })

  test("renders the General Web Search controls without persisting API key input in settings state", () => {
    expect(generalSource).toContain('data-action="settings-web-search-enabled"')
    expect(generalSource).toContain('data-action="settings-web-search-manage"')
    expect(generalSource).toContain("DialogConnectWebSearch")
    expect(generalSource).not.toContain("savingExaKey")
    expect(settingsSource).not.toContain("exaApiKey")
  })

  test("adds localized copy for status chips, dialog, and recovery toasts", () => {
    for (const key of [
      "settings.general.webSearch.title",
      "settings.general.webSearch.chip.free",
      "settings.general.webSearch.chip.loading",
      "settings.general.webSearch.chip.exhausted",
      "settings.general.webSearch.chip.personal",
      "settings.general.webSearch.chip.env",
      "settings.general.webSearch.chip.invalid",
      "settings.general.webSearch.secondary.exhausted",
      "settings.general.webSearch.action.manage",
      "dialog.websearch.title.default",
      "dialog.websearch.title.saved",
      "dialog.websearch.title.failed",
      "dialog.websearch.title.exhausted",
      "dialog.websearch.body.exhausted.line1",
      "dialog.websearch.body.exhausted.line2",
      "dialog.websearch.status.exhausted",
      "dialog.websearch.status.loading",
      "dialog.websearch.status.error",
      "dialog.websearch.action.retry",
      "toast.websearch.saved.title",
      "toast.websearch.removed.title",
      "toast.websearch.quota.title",
      "toast.websearch.invalidKey.title",
      "toast.websearch.action.openSettings",
    ]) {
      expect(enSource).toContain(`"${key}"`)
      expect(zhSource).toContain(`"${key}"`)
    }
  })
})
