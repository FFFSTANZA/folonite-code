import { Button } from "@opencode-ai/ui/button"
import { Icon } from "@opencode-ai/ui/icon"

export function FoloniteWorktreeBadge(props: {
  name: string
  branch?: string
  directory?: string
  onClick: () => void
  ariaLabel: string
  disabled?: boolean
}) {
  const title = () => [props.branch, props.directory].filter(Boolean).join(" · ") || props.name
  const label = () => (props.branch ? `${props.name} (${props.branch})` : props.name)

  return (
    <Button
      type="button"
      variant="ghost"
      size="medium"
      class="group h-8 max-w-[240px] min-w-0 shrink items-center gap-2 rounded-lg px-2.5 shadow-none text-13-medium text-text-weak hover:text-text-strong hover:bg-surface-base-hover transition-all"
      data-component="folonite-worktree-badge"
      title={title()}
      onClick={props.onClick}
      aria-label={props.ariaLabel}
      disabled={props.disabled}
    >
      <Icon name="worktree" size="small" class="shrink-0 text-icon-weak transition-colors group-hover:text-text-strong" />
      <span class="min-w-0 truncate">{label()}</span>
    </Button>
  )
}
