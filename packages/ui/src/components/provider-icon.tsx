import type { Component, JSX } from "solid-js"
import { createMemo, Match, splitProps, Switch } from "solid-js"
import sprite from "./provider-icons/sprite.svg"
import { iconNames, type IconName } from "./provider-icons/types"
import { Mark } from "./logo"

export type ProviderIconProps = JSX.SVGElementTags["svg"] & {
  id: string
}

export const ProviderIcon: Component<ProviderIconProps> = (props) => {
  const [local, rest] = splitProps(props, ["id", "class", "classList"])
  const resolved = createMemo(() => (iconNames.includes(local.id as IconName) ? local.id : "synthetic"))
  return (
    <Switch
      fallback={
        <svg
          data-component="provider-icon"
          {...rest}
          classList={{
            ...local.classList,
            [local.class ?? ""]: !!local.class,
          }}
        >
          <use href={`${sprite}#${resolved()}`} />
        </svg>
      }
    >
      <Match when={local.id === "opencode" || local.id === "opencode-go" || local.id === "folonite-ash-2" || local.id === "big-pickle"}>
        <Mark
          class={`${local.class ?? ""} shrink-0`}
          {...(rest as any)}
        />
      </Match>
    </Switch>
  )
}
