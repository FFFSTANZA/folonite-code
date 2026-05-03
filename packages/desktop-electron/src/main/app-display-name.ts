import type { MenuLocale } from "./menu-labels"

const zhNameMap = new Map([
  ["Folonite", "爪印"],
  ["Folonite Beta", "爪印 Beta"],
  ["Folonite Dev", "爪印 Dev"],
])

export function localizedAppDisplayName(appName: string, locale: MenuLocale) {
  if (locale !== "zh") return appName
  return zhNameMap.get(appName) ?? appName.replace(/^Folonite\b/, "爪印")
}
