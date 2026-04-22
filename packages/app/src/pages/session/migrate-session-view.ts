import { coerceLegacySidePanelTab, isRightPanelTab, normalizeShellTabs, type RightPanelTab } from "./right-panel-tabs"
import { same } from "@/utils/same"
import { isRecord } from "@/utils/is-record"

export interface LegacyEntry {
  sessionViewRaw: Record<string, unknown> | undefined
  rawOpenShellTabs: unknown
  migratedSidePanelTab: RightPanelTab | undefined
  reviewInSessionTabs: boolean
  contextInSessionTabs: boolean
  sessionTabsRaw: Record<string, unknown> | undefined
}

export interface MigrationOutput {
  sessionView: Record<string, unknown>
  sessionTabs: Record<string, unknown>
  changed: boolean
}

const fileTabsOnly = (tabs: readonly unknown[]): string[] =>
  tabs.filter((tab): tab is string => typeof tab === "string" && tab.startsWith("file://"))

export const resolveActiveCandidate = (entry: LegacyEntry): RightPanelTab | undefined => {
  const rawActive = entry.sessionTabsRaw?.active
  if (rawActive === "context") return "context"
  if (rawActive === "changes" || rawActive === "review") return "review"
  return entry.migratedSidePanelTab ?? (entry.reviewInSessionTabs ? "review" : undefined)
}

export const readLegacyState = (sessionView: unknown, sessionTabs: unknown): Map<string, LegacyEntry> => {
  const result = new Map<string, LegacyEntry>()
  const viewRecord = isRecord(sessionView) ? sessionView : {}
  const tabsRecord = isRecord(sessionTabs) ? sessionTabs : {}

  const keys = new Set<string>([...Object.keys(viewRecord), ...Object.keys(tabsRecord)])

  for (const key of keys) {
    const viewVal = isRecord(viewRecord[key]) ? (viewRecord[key] as Record<string, unknown>) : undefined
    const tabsVal = isRecord(tabsRecord[key]) ? (tabsRecord[key] as Record<string, unknown>) : undefined
    const tabsAll = Array.isArray(tabsVal?.all) ? (tabsVal.all as unknown[]) : []
    const tabsActive = typeof tabsVal?.active === "string" ? tabsVal.active : undefined
    const hasFileTabs = fileTabsOnly(tabsAll).length > 0

    result.set(key, {
      sessionViewRaw: viewVal,
      rawOpenShellTabs: viewVal?.openShellTabs,
      migratedSidePanelTab: coerceLegacySidePanelTab(viewVal?.sidePanelTab),
      reviewInSessionTabs:
        tabsAll.includes("changes") ||
        tabsAll.includes("review") ||
        hasFileTabs ||
        tabsActive === "changes" ||
        tabsActive === "review" ||
        !!tabsActive?.startsWith("file://"),
      contextInSessionTabs: tabsAll.includes("context") || tabsActive === "context",
      sessionTabsRaw: tabsVal,
    })
  }

  return result
}

export const applyLegacyState = (
  legacy: Map<string, LegacyEntry>,
  originalSessionView: unknown,
  originalSessionTabs: unknown,
): MigrationOutput => {
  const baseView = isRecord(originalSessionView) ? originalSessionView : {}
  const baseTabs = isRecord(originalSessionTabs) ? originalSessionTabs : {}
  const sessionView: Record<string, unknown> = { ...baseView }
  const sessionTabs: Record<string, unknown> = { ...baseTabs }
  let changed = false

  for (const [key, entry] of legacy) {
    const existing: RightPanelTab[] = Array.isArray(entry.rawOpenShellTabs)
      ? entry.rawOpenShellTabs.filter(isRightPanelTab)
      : []
    const candidate: RightPanelTab[] = ["status", ...existing.filter((tab) => tab !== "status")]

    if (entry.migratedSidePanelTab && !candidate.includes(entry.migratedSidePanelTab)) {
      candidate.push(entry.migratedSidePanelTab)
    }
    if (entry.reviewInSessionTabs && !candidate.includes("review")) {
      candidate.push("review")
    }
    if (entry.contextInSessionTabs && !candidate.includes("context")) {
      candidate.push("context")
    }

    const activeCandidate = resolveActiveCandidate(entry)
    const normalized = normalizeShellTabs({ openShellTabs: candidate, sidePanelTab: activeCandidate })
    const nextViewEntry = {
      ...(entry.sessionViewRaw ?? { scroll: {} }),
      openShellTabs: normalized.openShellTabs,
      sidePanelTab: normalized.sidePanelTab,
    }
    sessionView[key] = nextViewEntry

    const rawAll = Array.isArray(entry.sessionTabsRaw?.all) ? (entry.sessionTabsRaw.all as unknown[]) : []
    const rawActive = typeof entry.sessionTabsRaw?.active === "string" ? entry.sessionTabsRaw.active : undefined
    const all = fileTabsOnly(rawAll)
    const allHasOnlyFiles = all.length === rawAll.length
    const activeIsValidInnerTab =
      rawActive === undefined ||
      rawActive === "review" ||
      (rawActive.startsWith("file://") && all.includes(rawActive))
    let tabsShapeChanged = false

    if (entry.sessionTabsRaw && (!allHasOnlyFiles || !activeIsValidInnerTab)) {
      const active =
        rawActive === "changes" || rawActive === "review"
          ? "review"
          : rawActive && rawActive.startsWith("file://") && all.includes(rawActive)
            ? rawActive
            : undefined
      sessionTabs[key] = { ...entry.sessionTabsRaw, all, active }
      tabsShapeChanged = true
    }

    const rawOpenShellTabs = Array.isArray(entry.rawOpenShellTabs) ? entry.rawOpenShellTabs : undefined
    const viewShapeChanged =
      !entry.sessionViewRaw ||
      !rawOpenShellTabs ||
      !same(rawOpenShellTabs, normalized.openShellTabs) ||
      entry.sessionViewRaw.sidePanelTab !== normalized.sidePanelTab
    if (viewShapeChanged || tabsShapeChanged) changed = true
  }

  return { sessionView, sessionTabs, changed }
}

export const migrateSessionView = (sessionView: unknown, sessionTabs: unknown): MigrationOutput => {
  const legacy = readLegacyState(sessionView, sessionTabs)
  return applyLegacyState(legacy, sessionView, sessionTabs)
}
