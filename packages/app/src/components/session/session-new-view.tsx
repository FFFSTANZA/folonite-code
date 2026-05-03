import { Icon } from "@opencode-ai/ui/icon"
import { For, createSignal, Show, type JSX } from "solid-js"
import { useLanguage } from "@/context/language"
import { foloniteSkillCards, type FoloniteSkillName } from "./folonite-skill-meta"

type ComposerCtx = {
  onModeChange: (mode: "normal" | "shell") => void
  selectedSkill: () => FoloniteSkillName | undefined
}

export function NewSessionView(props: { composer?: (ctx: ComposerCtx) => JSX.Element }) {
  const language = useLanguage()
  const [selectedSkill, setSelectedSkill] = createSignal<FoloniteSkillName | undefined>()
  const [mode, setMode] = createSignal<"normal" | "shell">("normal")

  const toggleSkill = (name: FoloniteSkillName) => {
    setSelectedSkill((prev) => (prev === name ? undefined : name))
  }

  return (
    <div data-component="session-new-home" class="size-full overflow-y-auto">
      <div class="mx-auto flex w-full max-w-[800px] flex-col items-center px-6 pt-[24vh] pb-12 text-center md:px-8">
        <h1 class="text-32-semibold text-text-strong tracking-tight">{language.t("session.new.title")}</h1>
        <p class="mt-3 text-15-regular text-text-weak max-w-[500px]">
          {language.t("session.new.description") || "Start a new conversation or select a specialized skill to begin your work."}
        </p>

        <Show when={props.composer}>
          <div class="mt-10 flex w-full max-w-[720px] flex-col items-center">
            {props.composer!({ onModeChange: setMode, selectedSkill })}
          </div>
        </Show>

        <div class="mt-8 flex w-fit max-w-[680px] flex-wrap items-center justify-center gap-3.5">
          <For each={foloniteSkillCards}>
            {(card) => {
              const isSelected = () => mode() === "normal" && selectedSkill() === card.name
              return (
                <button
                  type="button"
                  data-skill-card={card.name}
                  aria-pressed={isSelected()}
                  classList={{
                    "inline-flex h-9 items-center gap-2 rounded-2xl border px-4 text-14-medium transition-all duration-200": true,
                    "border-border-base bg-surface-base text-text-base hover:border-border-strong-base hover:bg-surface-base-hover hover:shadow-sm":
                      !isSelected(),
                    "border-primary bg-surface-interactive-weak text-primary shadow-sm scale-[1.02]":
                      isSelected(),
                  }}
                  onClick={() => toggleSkill(card.name)}
                >
                  <Icon name={card.homeIcon} size="normal" classList={{
                    "shrink-0 transition-colors": true,
                    "text-icon-weak": !isSelected(),
                    "text-primary": isSelected(),
                  }} />
                  <span class="truncate">{language.t(card.titleKey)}</span>
                </button>
              )
            }}
          </For>
        </div>
      </div>
    </div>
  )
}
