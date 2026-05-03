import { Button } from "@opencode-ai/ui/button"
import { Icon } from "@opencode-ai/ui/icon"
import { showToast } from "@opencode-ai/ui/toast"
import { Tooltip } from "@opencode-ai/ui/tooltip"
import { getFilename } from "@opencode-ai/util/path"
import { createMediaQuery } from "@solid-primitives/media"
import { createMemo, createSignal, onMount, Show } from "solid-js"
import { useLocation } from "@solidjs/router"
import { Portal } from "solid-js/web"
import { useLanguage } from "@/context/language"
import { useLayout } from "@/context/layout"
import { usePlatform } from "@/context/platform"
import { useServer } from "@/context/server"
import { useShellSurface } from "@/context/shell-surface"
import { useSync } from "@/context/sync"
import { FoloniteWorktreeBadge } from "@/pages/layout/folonite-worktree-badge"
import { useSessionLayout } from "@/pages/session/session-layout"
import { decode64 } from "@/utils/base64"
import { StatusPopover } from "../status-popover"

export function SessionHeader() {
  const layout = useLayout()
  const language = useLanguage()
  const platform = usePlatform()
  const server = useServer()
  const shellSurface = useShellSurface()
  const sync = useSync()
  const location = useLocation()
  const { params, view } = useSessionLayout()
  const isDesktop = createMediaQuery("(min-width: 768px)")

  const projectDirectory = createMemo(() => decode64(params.dir) ?? "")
  const project = createMemo(() => {
    const directory = projectDirectory()
    if (!directory) return
    return layout.projects.list().find((p) => p.worktree === directory || p.sandboxes?.includes(directory))
  })
  const name = createMemo(() => {
    const current = project()
    if (current) return current.name || getFilename(current.worktree)
    return getFilename(projectDirectory())
  })
  const sessionInfo = createMemo(() => (params.id ? sync.session.get(params.id) : undefined))
  const sessionTitle = createMemo(() => sessionInfo()?.title || params.id || "")
  const activeWorktree = createMemo(() => {
    const exec = sessionInfo()?.executionContext
    if (!exec || exec.activeDirectory === exec.ownerDirectory) return
    return exec.activeWorktree
  })
  const homeTitle = createMemo(() => language.t("command.session.new"))
  const onSessionRoute = createMemo(() => location.pathname.includes("/session"))
  const fileManagerLabel = createMemo(() => {
    if (platform.os === "windows") return language.t("session.header.open.fileExplorer")
    if (platform.os === "linux") return language.t("session.header.open.fileManager")
    return language.t("session.header.open.finder")
  })
  const canOpenDirectory = (directory?: string) =>
    platform.platform === "desktop" && !!platform.openPath && server.isLocal() && !!directory
  const activeWorktreeDirectory = createMemo(() => activeWorktree()?.directory ?? "")
  const canOpenProjectDirectory = createMemo(() => canOpenDirectory(projectDirectory()))
  const canOpenActiveWorktreeDirectory = createMemo(() => canOpenDirectory(activeWorktreeDirectory()))
  const rightPanelOpen = createMemo(() => view().sidePanel.opened())
  const toggleRightPanel = () => {
    if (rightPanelOpen()) {
      view().sidePanel.close()
      return
    }
    view().sidePanel.open()
  }
  const openDirectory = (directory: string) => {
    if (!canOpenDirectory(directory) || !platform.openPath) return
    void platform.openPath(directory).catch((error) => {
      showToast({
        variant: "error",
        title: language.t("common.requestFailed"),
        description: error instanceof Error ? error.message : String(error),
      })
    })
  }
  const openProjectDirectory = () => openDirectory(projectDirectory())
  const openActiveWorktree = () => {
    openDirectory(activeWorktreeDirectory())
  }

  const [centerMount, setCenterMount] = createSignal<HTMLElement>()
  const [rightMount, setRightMount] = createSignal<HTMLElement>()

  onMount(() => {
    setCenterMount(document.getElementById("folonite-titlebar-center") ?? undefined)
    setRightMount(document.getElementById("folonite-titlebar-right") ?? undefined)
  })

  return (
    <>
      <Show when={!shellSurface.settingsOpen() && centerMount()}>
        {(mount) => (
          <Portal mount={mount()}>
            <div class="hidden md:flex w-full min-w-0 max-w-[800px] items-center justify-center overflow-hidden text-14-medium gap-3 mx-auto">
              <Show
                when={params.id}
                fallback={<div class="min-w-0 truncate text-text-strong text-16-medium">{homeTitle()}</div>}
              >
                <span class="max-w-full shrink-0 truncate text-14-semibold text-text-strong" title={sessionTitle()}>
                  {sessionTitle()}
                </span>
                <div class="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
                  <Show when={projectDirectory()}>
                    <Button
                      type="button"
                      variant="ghost"
                      size="medium"
                      class="group h-8 max-w-[240px] min-w-0 shrink items-center gap-2 rounded-lg px-2.5 shadow-none text-13-medium text-text-weak hover:text-text-strong hover:bg-surface-base-hover transition-all"
                      onClick={openProjectDirectory}
                      aria-label={
                        canOpenProjectDirectory() ? language.t("session.header.open.ariaLabel", { app: fileManagerLabel() }) : undefined
                      }
                      title={
                        canOpenProjectDirectory()
                          ? `${projectDirectory()} (${language.t("session.header.open.ariaLabel", { app: fileManagerLabel() })})`
                          : projectDirectory()
                      }
                      disabled={!canOpenProjectDirectory()}
                    >
                      <Icon name="folder" size="small" class="shrink-0 text-icon-weak transition-colors group-hover:text-text-strong" />
                      <span class="min-w-0 truncate">{name()}</span>
                    </Button>
                  </Show>
                  <Show when={activeWorktree()}>
                    {(worktree) => (
                      <FoloniteWorktreeBadge
                        name={worktree().name}
                        branch={worktree().branch}
                        directory={worktree().directory}
                        onClick={openActiveWorktree}
                        ariaLabel={language.t("session.header.worktree.open")}
                        disabled={!canOpenActiveWorktreeDirectory()}
                      />
                    )}
                  </Show>
                </div>
              </Show>
            </div>
          </Portal>
        )}
      </Show>
      <Show when={!shellSurface.settingsOpen() && rightMount()}>
        {(mount) => (
          <Portal mount={mount()}>
            <Show
              when={onSessionRoute() && isDesktop()}
              fallback={
                <Tooltip placement="bottom" value={language.t("status.popover.trigger")}>
                  <StatusPopover />
                </Tooltip>
              }
            >
              <Tooltip placement="bottom" value={language.t("session.panel.utility")}>
                <Button
                  variant="ghost"
                  class="titlebar-icon w-8 h-6 p-0 box-border"
                  onClick={toggleRightPanel}
                  aria-label={language.t("session.panel.utility")}
                  aria-expanded={rightPanelOpen()}
                  aria-controls="right-panel"
                >
                  <Icon
                    size="small"
                    name={rightPanelOpen() ? "sidebar-active" : "sidebar"}
                    class="-scale-x-100"
                  />
                </Button>
              </Tooltip>
            </Show>
          </Portal>
        )}
      </Show>
    </>
  )
}
