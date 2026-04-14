import { For, createSignal } from "solid-js"
import { useSDK } from "@/context/sdk"
import { useLocal } from "@/context/local"
import { useLanguage } from "@/context/language"
import { useNavigate } from "@solidjs/router"
import { base64Encode } from "@opencode-ai/util/encode"
import { showToast } from "@opencode-ai/ui/toast"
import { Mark } from "@opencode-ai/ui/logo"
import { pawworkSkillCards, type PawworkSkillName } from "./pawwork-skill-meta"

export function NewSessionView() {
  const sdk = useSDK()
  const local = useLocal()
  const language = useLanguage()
  const navigate = useNavigate()
  const [pending, setPending] = createSignal<PawworkSkillName>()

  const start = async (name: PawworkSkillName) => {
    if (pending()) return

    const agent = local.agent.current()
    const model = local.model.current()

    if (!agent || !model) {
      showToast({
        title: language.t("prompt.toast.modelAgentRequired.title"),
        description: language.t("prompt.toast.modelAgentRequired.description"),
      })
      return
    }

    setPending(name)
    let created: { id: string } | undefined

    try {
      created = await sdk.client.session.create({ skill: name }).then((res) => res.data ?? undefined)
      if (!created) throw new Error(language.t("prompt.toast.sessionCreateFailed.description"))

      local.session.promote(sdk.directory, created.id)
      navigate(`/${base64Encode(sdk.directory)}/session/${created.id}`)

      await sdk.client.session.command({
        sessionID: created.id,
        command: name,
        arguments: "",
        agent: agent.name,
        model: `${model.provider.id}/${model.id}`,
        variant: local.model.variant.current() ?? undefined,
        parts: [],
      })
    } catch (error) {
      if (created?.id) {
        await sdk.client.session.delete({ sessionID: created.id }).catch(() => undefined)
        navigate(`/${base64Encode(sdk.directory)}/session`)
      }

      showToast({
        title: language.t("prompt.toast.commandSendFailed.title"),
        description: error instanceof Error ? error.message : language.t("common.requestFailed"),
      })
    } finally {
      setPending(undefined)
    }
  }

  return (
    <div class="size-full flex items-center justify-center px-6 pb-30">
      <div class="w-full max-w-200 flex flex-col items-center gap-6 text-center">
        <Mark class="w-10" />
        <div class="flex flex-col gap-2">
          <h1 class="text-24-medium text-text-strong">{language.t("session.new.title")}</h1>
          <p class="text-14-regular text-text-weak">{language.t("session.new.subtitle")}</p>
        </div>
        <div class="grid w-full max-w-170 gap-3 md:grid-cols-3">
          <For each={pawworkSkillCards}>
            {(card) => (
              <button
                type="button"
                data-skill-card={card.name}
                class="rounded-2xl border border-border-weak-base bg-surface-raised-strong p-4 text-left transition-colors hover:bg-surface-raised-base-hover disabled:cursor-not-allowed disabled:opacity-70"
                disabled={pending() === card.name}
                onClick={() => void start(card.name)}
              >
                <div class="text-24 leading-none">{card.emoji}</div>
                <div class="mt-3 text-16-medium text-text-strong">{language.t(card.titleKey)}</div>
                <div class="mt-1 text-14-regular text-text-weak">{language.t(card.descriptionKey)}</div>
              </button>
            )}
          </For>
        </div>
      </div>
    </div>
  )
}
