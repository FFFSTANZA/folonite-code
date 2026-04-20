import type { Session } from "@opencode-ai/sdk/v2/client"
import { Button } from "@opencode-ai/ui/button"
import { DropdownMenu } from "@opencode-ai/ui/dropdown-menu"
import { IconButton } from "@opencode-ai/ui/icon-button"
import { createEffect, createMemo, createSignal, For, Show, type Accessor, type JSX } from "solid-js"
import { useLanguage } from "@/context/language"
import { createInlineEditorController } from "./inline-editor"
import { buildPawworkSessionSections, type PawworkSortMode } from "./pawwork-session-nav"
import { SessionItem } from "./sidebar-items"

export type PawworkSidebarSession = {
  session: Session
  slug: string
  projectLabel: string
  updated: number
}

export const PawworkSidebar = (props: {
  scope?: "main" | "peek"
  mobile?: boolean
  sessions: Accessor<PawworkSidebarSession[]>
  showProjectEmptyState: boolean
  activeSessionID?: Accessor<string | undefined>
  pinnedIDs: Accessor<string[]>
  sortMode: Accessor<PawworkSortMode>
  sidebarExpanded: Accessor<boolean>
  setScrollContainerRef: (el: HTMLDivElement | undefined, mobile?: boolean) => void
  clearHoverProjectSoon: () => void
  prefetchSession: (session: Session, priority?: "high" | "low") => void
  archiveSession: (session: Session) => Promise<void>
  onRenameSession: (session: Session, next: string) => Promise<void>
  onTogglePinnedSession: (sessionID: string) => void
  onSetSortMode: (mode: PawworkSortMode) => void
  onNew: () => void
  onSearch: () => void
  onOpenProject: () => void
}): JSX.Element => {
  const language = useLanguage()
  const editor = createInlineEditorController()
  const [pendingRenameID, setPendingRenameID] = createSignal<string>()
  const navList = createMemo(() => props.sessions().map((item) => item.session))
  const showProjectLabels = createMemo(() => new Set(props.sessions().map((item) => item.projectLabel)).size > 1)
  let scrollEl: HTMLDivElement | undefined
  const byID = createMemo(() => new Map(props.sessions().map((item) => [item.session.id, item] as const)))
  const sections = createMemo(() =>
    buildPawworkSessionSections({
      sessions: props.sessions().map((item) => ({
        id: item.session.id,
        title: item.session.title ?? "",
        directory: item.session.directory,
        projectLabel: item.projectLabel,
        updated: item.updated,
      })),
      pinnedIDs: props.pinnedIDs(),
      sortMode: props.sortMode(),
      currentSessionID: props.activeSessionID?.(),
    }),
  )
  const rows = createMemo(() =>
    sections().recent.map((item, index, list) => ({
      item: byID().get(item.id)!,
      showProjectLabel: showProjectLabels() && list[index - 1]?.projectLabel !== item.projectLabel,
    })),
  )
  const pinnedRows = createMemo(() =>
    sections().pinned.map((item) => ({
      item: byID().get(item.id)!,
      showProjectLabel: false,
    })),
  )
  const groupedRows = createMemo(() =>
    sections().groups.map((group) => ({
      label: group.label,
      items: group.items.map((item) => byID().get(item.id)!).filter(Boolean),
    })),
  )

  const renderSessionItem = (entry: { item: PawworkSidebarSession; showProjectLabel: boolean }) => (
    <div class="flex flex-col gap-1">
      <Show when={entry.showProjectLabel}>
        <div data-component="pawwork-group-header" class="px-2 pt-3 pb-1 text-11-medium text-text-weak">
          {entry.item.projectLabel}
        </div>
      </Show>
      <SessionItem
        session={entry.item.session}
        list={navList()}
        navList={navList}
        slug={entry.item.slug}
        mobile={props.mobile}
        showChild
        sidebarExpanded={props.sidebarExpanded}
        clearHoverProjectSoon={props.clearHoverProjectSoon}
        prefetchSession={props.prefetchSession}
        archiveSession={props.archiveSession}
        hideDefaultArchiveAction
        titleContent={({ session, title }) => (
          <editor.InlineEditor
            id={`pawwork-session:${session.id}`}
            value={title}
            onSave={(next) => {
              void props.onRenameSession(session, next)
            }}
            class="text-14-regular text-text-strong min-w-0 flex-1 truncate"
            displayClass="text-14-regular text-text-strong min-w-0 flex-1 truncate"
          />
        )}
        onDoubleClick={(session) => {
          editor.openEditor(`pawwork-session:${session.id}`, session.title ?? "")
        }}
        actionSlot={(session) => (
          <DropdownMenu>
            <DropdownMenu.Trigger
              as={IconButton}
              icon="dot-grid"
              variant="ghost"
              class="size-6 rounded-md"
              data-action="session-row-menu"
              aria-label={language.t("common.moreOptions")}
              onClick={(event: MouseEvent) => {
                event.preventDefault()
                event.stopPropagation()
              }}
            />
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                onCloseAutoFocus={(event) => {
                  if (pendingRenameID() !== session.id) return
                  event.preventDefault()
                  setPendingRenameID(undefined)
                  requestAnimationFrame(() => {
                    editor.openEditor(`pawwork-session:${session.id}`, session.title ?? "")
                  })
                }}
              >
                <DropdownMenu.Item onSelect={() => props.onTogglePinnedSession(session.id)}>
                  <DropdownMenu.ItemLabel>
                    {props.pinnedIDs().includes(session.id)
                      ? language.t("sidebar.pawwork.unpinSession")
                      : language.t("sidebar.pawwork.pinSession")}
                  </DropdownMenu.ItemLabel>
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  onSelect={() => {
                    setPendingRenameID(session.id)
                  }}
                >
                  <DropdownMenu.ItemLabel>{language.t("common.rename")}</DropdownMenu.ItemLabel>
                </DropdownMenu.Item>
                <DropdownMenu.Item onSelect={() => void props.archiveSession(session)}>
                  <DropdownMenu.ItemLabel>{language.t("common.archive")}</DropdownMenu.ItemLabel>
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu>
        )}
      />
    </div>
  )

  createEffect(() => {
    const activeSessionID = props.activeSessionID?.()
    rows()
    const el = scrollEl
    if (!activeSessionID || !el) return

    requestAnimationFrame(() => {
      const row = el.querySelector<HTMLElement>(`[data-session-id="${activeSessionID}"]`)
      if (!row) return
      row.scrollIntoView({ block: "nearest" })
    })
  })

  return (
    <section
      data-component="pawwork-sidebar"
      data-sidebar-scope={props.scope ?? "main"}
      class="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden border-l border-t border-border-weaker-base bg-background-base px-3"
    >
      <div class="shrink-0 border-b border-border-weaker-base py-3">
        <div class="px-2 text-14-medium text-text-strong">PawWork</div>
        <div class="mt-3 flex flex-col gap-2">
          <Button data-action="pawwork-session-new" size="large" icon="new-session" class="w-full" onClick={props.onNew}>
            {language.t("command.session.new")}
          </Button>
          <Button data-action="pawwork-session-search" size="large" variant="ghost" class="w-full" onClick={props.onSearch}>
            {language.t("sidebar.pawwork.search")}
          </Button>
        </div>
        <div class="mt-3 flex justify-end">
          <Button
            data-action="pawwork-sort-mode"
            size="small"
            variant="ghost"
            onClick={() => props.onSetSortMode(props.sortMode() === "time" ? "project" : "time")}
          >
            {props.sortMode() === "time" ? language.t("sidebar.pawwork.sort.byProject") : language.t("sidebar.pawwork.sort.byTime")}
          </Button>
        </div>
      </div>

      <Show
        when={!props.showProjectEmptyState}
        fallback={
          <div class="flex flex-1 items-center px-3">
            <div class="flex w-full flex-col gap-3 rounded-xl border border-border-weak-base bg-surface-base p-4">
              <div class="text-14-medium text-text-strong">{language.t("sidebar.empty.title")}</div>
              <p class="text-13-regular text-text-weak">{language.t("sidebar.pawwork.empty.description")}</p>
              <Button data-action="pawwork-open-project" size="large" onClick={props.onOpenProject}>
                {language.t("command.project.open")}
              </Button>
            </div>
          </div>
        }
      >
        <div
          ref={(el) => {
            scrollEl = el
            props.setScrollContainerRef(el, props.mobile)
          }}
          data-component="pawwork-session-scroll"
          class="flex-1 min-h-0 overflow-y-auto py-3"
        >
          <Show
            when={props.sessions().length > 0}
            fallback={<div class="px-2 text-13-regular text-text-weak">{language.t("sidebar.pawwork.empty.sessions")}</div>}
          >
            <nav class="flex flex-col gap-1">
              <Show when={pinnedRows().length > 0}>
                <section data-component="pawwork-sidebar-pinned" class="flex flex-col gap-1">
                  <div class="px-2 pb-1 text-11-medium text-text-weak">{language.t("sidebar.pawwork.pinned")}</div>
                  <For each={pinnedRows()}>{(entry) => renderSessionItem(entry)}</For>
                </section>
              </Show>
              <Show when={props.sortMode() === "time"}>
                <For each={rows()}>{(entry) => renderSessionItem(entry)}</For>
              </Show>
              <Show when={props.sortMode() === "project"}>
                <For each={groupedRows()}>
                  {(group) => (
                    <section class="flex flex-col gap-1">
                      <div data-component="pawwork-group-header" class="px-2 pt-3 pb-1 text-11-medium text-text-weak">
                        {group.label}
                      </div>
                      <For each={group.items}>{(item) => renderSessionItem({ item, showProjectLabel: false })}</For>
                    </section>
                  )}
                </For>
              </Show>
            </nav>
          </Show>
        </div>
      </Show>
    </section>
  )
}
