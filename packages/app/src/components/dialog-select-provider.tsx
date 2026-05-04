import { Component, Show } from "solid-js"
import { useDialog } from "@opencode-ai/ui/context/dialog"
import { popularProviders, useProviders } from "@/hooks/use-providers"
import { Dialog } from "@opencode-ai/ui/dialog"
import { List } from "@opencode-ai/ui/list"
import { Tag } from "@opencode-ai/ui/tag"
import { ProviderIcon } from "@opencode-ai/ui/provider-icon"
import { DialogConnectProvider } from "./dialog-connect-provider"
import { useLanguage } from "@/context/language"
import { DialogCustomProvider } from "./dialog-custom-provider"

const CUSTOM_ID = "_custom"

export const DialogSelectProvider: Component = () => {
  const dialog = useDialog()
  const providers = useProviders()
  const language = useLanguage()

  const popularGroup = () => language.t("dialog.provider.group.popular")
  const otherGroup = () => language.t("dialog.provider.group.other")
  const customLabel = () => language.t("settings.providers.tag.custom")
  const note = (id: string) => {
    if (id === "anthropic") return language.t("dialog.provider.anthropic.note")
    if (id === "openai") return language.t("dialog.provider.openai.note")
    if (id.startsWith("github-copilot")) return language.t("dialog.provider.copilot.note")
    if (id === "opencode-go") return language.t("dialog.provider.opencodeGo.tagline")
    if (id === "folonite-ash-2") return language.t("provider.connect.foloniteAsh2.tagline")

  }

  return (
    <Dialog title={language.t("command.provider.connect")} transition>
      <List
        search={{ placeholder: language.t("dialog.provider.search.placeholder"), autofocus: true }}
        emptyMessage={language.t("dialog.provider.empty")}
        activeIcon="plus-small"
        key={(x) => x?.id}
        items={() => {
          language.locale()
          return [{ id: CUSTOM_ID, name: customLabel() }, ...providers.all()]
        }}
        filterKeys={["id", "name"]}
        groupBy={(x) => (popularProviders.includes(x.id) ? popularGroup() : otherGroup())}
        sortBy={(a, b) => {
          if (a.id === "folonite-ash-2") return -1
          if (b.id === "folonite-ash-2") return 1
          if (a.id === CUSTOM_ID) return -1
          if (b.id === CUSTOM_ID) return 1
          if (popularProviders.includes(a.id) && popularProviders.includes(b.id))
            return popularProviders.indexOf(a.id) - popularProviders.indexOf(b.id)
          return a.name.localeCompare(b.name)
        }}

        sortGroupsBy={(a, b) => {
          const popular = popularGroup()
          if (a.category === popular && b.category !== popular) return -1
          if (b.category === popular && a.category !== popular) return 1
          return 0
        }}
        onSelect={(x) => {
          if (!x) return
          if (x.id === CUSTOM_ID) {
            dialog.show(() => <DialogCustomProvider back="providers" />)
            return
          }
          dialog.show(() => <DialogConnectProvider provider={x.id} />)
        }}
      >
        {(i) => (
          <div class="px-1.25 w-full flex items-center gap-x-3">
            <ProviderIcon data-slot="list-item-extra-icon" id={i.id} class="size-5 shrink-0 icon-strong-base" />
            <span>{i.name}</span>
            <Show when={i.id === CUSTOM_ID}>
              <Tag>{language.t("settings.providers.tag.custom")}</Tag>
            </Show>
            <Show
              when={
                i.id === "anthropic" ||
                i.id === "openai" ||
                i.id === "opencode-go" ||
                i.id === "folonite-ash-2"
              }
            >
              <Tag class={i.id === "folonite-ash-2" ? "tag-gold" : ""}>
                {language.t("dialog.provider.tag.recommended")}
              </Tag>
            </Show>

            <Show when={note(i.id)}>{(value) => <div class="text-13-regular text-text-weak">{value()}</div>}</Show>
          </div>
        )}
      </List>
    </Dialog>
  )
}
