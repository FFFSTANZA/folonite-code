import { describe, expect, test } from "bun:test"

import {
  coerceLegacySidePanelTab,
  defaultRightPanelTab,
  isRightPanelTab,
  migrateLegacyRightPanelTab,
  normalizeShellTabs,
  RIGHT_PANEL_TAB_VALUES,
  type RightPanelTab,
} from "./right-panel-tabs"

describe("right panel tab helpers", () => {
  test("defaults to status for sessions without stored tab", () => {
    expect(defaultRightPanelTab()).toBe("status")
  })

  test("migrates old changes tab to review", () => {
    expect(migrateLegacyRightPanelTab("changes")).toBe("review")
  })

  test("migrates old files tab to files", () => {
    expect(migrateLegacyRightPanelTab("files")).toBe("files")
  })

  test("keeps new right panel tabs stable", () => {
    const tabs: RightPanelTab[] = ["status", "files", "review", "terminal"]
    expect(tabs.map((tab) => migrateLegacyRightPanelTab(tab))).toEqual(tabs)
  })
})

describe("isRightPanelTab", () => {
  test("accepts all known tabs", () => {
    for (const tab of RIGHT_PANEL_TAB_VALUES) expect(isRightPanelTab(tab)).toBe(true)
  })

  test("rejects unknown strings and non-strings", () => {
    expect(isRightPanelTab("changes")).toBe(false)
    expect(isRightPanelTab(undefined)).toBe(false)
    expect(isRightPanelTab(123)).toBe(false)
    expect(isRightPanelTab(null)).toBe(false)
  })
})

describe("coerceLegacySidePanelTab", () => {
  test("maps changes to review", () => {
    expect(coerceLegacySidePanelTab("changes")).toBe("review")
  })

  test("passes through known tabs", () => {
    expect(coerceLegacySidePanelTab("status")).toBe("status")
    expect(coerceLegacySidePanelTab("files")).toBe("files")
    expect(coerceLegacySidePanelTab("context")).toBe("context")
  })

  test("returns undefined for unknown values", () => {
    expect(coerceLegacySidePanelTab(undefined)).toBe(undefined)
    expect(coerceLegacySidePanelTab("foo")).toBe(undefined)
    expect(coerceLegacySidePanelTab(42)).toBe(undefined)
  })
})

describe("normalizeShellTabs", () => {
  test("empty input returns status-only", () => {
    expect(normalizeShellTabs({ openShellTabs: undefined, sidePanelTab: undefined })).toEqual({
      openShellTabs: ["status"],
      sidePanelTab: "status",
    })
  })

  test("non-array openShellTabs coerces to status-only", () => {
    expect(normalizeShellTabs({ openShellTabs: "review", sidePanelTab: "review" })).toEqual({
      openShellTabs: ["status"],
      sidePanelTab: "status",
    })
  })

  test("injects status at head if missing", () => {
    expect(normalizeShellTabs({ openShellTabs: ["files", "review"], sidePanelTab: "files" })).toEqual({
      openShellTabs: ["status", "files", "review"],
      sidePanelTab: "files",
    })
  })

  test("dedupes preserving first occurrence", () => {
    expect(
      normalizeShellTabs({ openShellTabs: ["status", "files", "files", "review"], sidePanelTab: "review" }),
    ).toEqual({
      openShellTabs: ["status", "files", "review"],
      sidePanelTab: "review",
    })
  })

  test("drops invalid tab values", () => {
    expect(normalizeShellTabs({ openShellTabs: ["status", "changes", 123, "review"], sidePanelTab: "review" })).toEqual(
      {
        openShellTabs: ["status", "review"],
        sidePanelTab: "review",
      },
    )
  })

  test("falls back to status when sidePanelTab not in list", () => {
    expect(normalizeShellTabs({ openShellTabs: ["status", "files"], sidePanelTab: "review" })).toEqual({
      openShellTabs: ["status", "files"],
      sidePanelTab: "status",
    })
  })

  test("idempotent", () => {
    const once = normalizeShellTabs({ openShellTabs: ["files", "status", "files"], sidePanelTab: "files" })
    const twice = normalizeShellTabs(once)
    expect(twice).toEqual(once)
  })
})
