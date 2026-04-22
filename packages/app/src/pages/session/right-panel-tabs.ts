export type RightPanelTab = "status" | "files" | "review" | "terminal" | "context"

export const RIGHT_PANEL_TAB_VALUES: readonly RightPanelTab[] = [
  "status",
  "files",
  "review",
  "terminal",
  "context",
] as const

export type RightPanelShellIconName = "status" | "folder" | "review" | "terminal"

export type ShellTabIcon =
  | { kind: "icon"; name: RightPanelShellIconName }
  | { kind: "indicator"; fallbackIcon: RightPanelShellIconName }

export type RightPanelTabLabelKey =
  | "status.popover.trigger"
  | "session.panel.files"
  | "session.tab.review"
  | "terminal.title"
  | "session.tab.context"

export interface RightPanelTabMeta {
  icon: ShellTabIcon
  labelKey: RightPanelTabLabelKey
  commandId?: string
  closable: boolean
}

export const RIGHT_PANEL_TAB_META: Record<RightPanelTab, RightPanelTabMeta> = {
  status: { icon: { kind: "icon", name: "status" }, labelKey: "status.popover.trigger", closable: false },
  files: {
    icon: { kind: "icon", name: "folder" },
    labelKey: "session.panel.files",
    commandId: "fileTree.toggle",
    closable: true,
  },
  review: {
    icon: { kind: "icon", name: "review" },
    labelKey: "session.tab.review",
    commandId: "review.toggle",
    closable: true,
  },
  terminal: {
    icon: { kind: "icon", name: "terminal" },
    labelKey: "terminal.title",
    commandId: "terminal.toggle",
    closable: true,
  },
  context: {
    icon: { kind: "indicator", fallbackIcon: "status" },
    labelKey: "session.tab.context",
    closable: true,
  },
}

export const isRightPanelTab = (value: unknown): value is RightPanelTab =>
  typeof value === "string" && (RIGHT_PANEL_TAB_VALUES as readonly string[]).includes(value)

// Used when reading legacy persisted state where invalid input should remain unset.
export const coerceLegacySidePanelTab = (value: unknown): RightPanelTab | undefined => {
  if (value === "changes") return "review"
  return isRightPanelTab(value) ? value : undefined
}

// Used for default tab migration where callers always need a concrete fallback.
export const migrateLegacyRightPanelTab = (tab?: string): RightPanelTab => {
  if (tab === "changes") return "review"
  if (tab === "files") return "files"
  if (tab === "review" || tab === "status" || tab === "terminal" || tab === "context") return tab
  return "status"
}

export const defaultRightPanelTab = (tab?: string) => migrateLegacyRightPanelTab(tab)

export interface ShellTabState {
  openShellTabs: RightPanelTab[]
  sidePanelTab: RightPanelTab
}

export const normalizeShellTabs = (input: { openShellTabs: unknown; sidePanelTab: unknown }): ShellTabState => {
  const filtered: RightPanelTab[] = []
  const seen = new Set<RightPanelTab>()

  if (Array.isArray(input.openShellTabs)) {
    for (const entry of input.openShellTabs) {
      if (!isRightPanelTab(entry)) continue
      if (seen.has(entry)) continue
      seen.add(entry)
      filtered.push(entry)
    }
  }

  const openShellTabs: RightPanelTab[] =
    filtered[0] === "status" ? filtered : ["status", ...filtered.filter((tab) => tab !== "status")]

  const requested = isRightPanelTab(input.sidePanelTab) ? input.sidePanelTab : "status"
  const sidePanelTab: RightPanelTab = openShellTabs.includes(requested) ? requested : "status"

  return { openShellTabs, sidePanelTab }
}

export const openShellTab = (state: ShellTabState, target: RightPanelTab): ShellTabState => {
  const openShellTabs = state.openShellTabs.includes(target) ? state.openShellTabs : [...state.openShellTabs, target]
  return normalizeShellTabs({ openShellTabs, sidePanelTab: target })
}

export const closeShellTab = (state: ShellTabState, target: RightPanelTab): ShellTabState => {
  if (target === "status") return state

  const index = state.openShellTabs.indexOf(target)
  if (index === -1) return state

  const nextActive =
    state.sidePanelTab === target
      ? (state.openShellTabs[index - 1] ?? state.openShellTabs[index + 1] ?? "status")
      : state.sidePanelTab

  return normalizeShellTabs({
    openShellTabs: state.openShellTabs.filter((tab) => tab !== target),
    sidePanelTab: nextActive,
  })
}

export const toggleShellTab = (
  state: ShellTabState,
  target: RightPanelTab,
  panelOpen: boolean,
): { state: ShellTabState; closePanel: boolean } => {
  if (target === "status") return { state: openShellTab(state, target), closePanel: false }
  if (state.sidePanelTab === target && panelOpen) return { state, closePanel: true }
  return { state: openShellTab(state, target), closePanel: false }
}

export const moveShellTab = (state: ShellTabState, target: RightPanelTab, to: number): ShellTabState => {
  if (target === "status") return state

  const from = state.openShellTabs.indexOf(target)
  if (from === -1) return state

  // Minimum index 1 keeps tabs after pinned status; maximum is the last open tab position.
  const clampedTo = Math.min(Math.max(to, 1), state.openShellTabs.length - 1)
  const next = [...state.openShellTabs]
  next.splice(clampedTo, 0, next.splice(from, 1)[0])
  return normalizeShellTabs({ openShellTabs: next, sidePanelTab: state.sidePanelTab })
}
