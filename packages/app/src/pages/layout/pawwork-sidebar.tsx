import type { Session } from "@opencode-ai/sdk/v2/client"
import { Button } from "@opencode-ai/ui/button"
import { createEffect, createMemo, For, Show, type Accessor, type JSX } from "solid-js"
import { useLanguage } from "@/context/language"
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
  sidebarExpanded: Accessor<boolean>
  setScrollContainerRef: (el: HTMLDivElement | undefined, mobile?: boolean) => void
  clearHoverProjectSoon: () => void
  prefetchSession: (session: Session, priority?: "high" | "low") => void
  archiveSession: (session: Session) => Promise<void>
  onNew: () => void
  onSearch: () => void
  onOpenProject: () => void
}): JSX.Element => {
  const language = useLanguage()
  const navList = createMemo(() => props.sessions().map((item) => item.session))
  const showProjectLabels = createMemo(() => new Set(props.sessions().map((item) => item.projectLabel)).size > 1)
  let scrollEl: HTMLDivElement | undefined
  const rows = createMemo(() =>
    props.sessions().map((item, index, list) => ({
      item,
      showProjectLabel: showProjectLabels() && list[index - 1]?.projectLabel !== item.projectLabel,
    })),
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
              <For each={rows()}>
                {(entry) => (
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
                    />
                  </div>
                )}
              </For>
            </nav>
          </Show>
        </div>
      </Show>
    </section>
  )
}
