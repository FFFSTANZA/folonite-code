import type { Locale } from "@/context/language"

export type DesktopContext = {
  directory: string | null
  sessionID: string | null
  route: string
  locale: Locale
  title: string
}

export function desktopWindowTitle(locale: Locale) {
  return locale === "zh" ? "爪印" : "PawWork"
}

export function buildDesktopContext(input: {
  directory?: string | null
  sessionID?: string | null
  route: string
  locale: Locale
}): DesktopContext {
  return {
    directory: input.directory ?? null,
    sessionID: input.sessionID ?? null,
    route: input.route,
    locale: input.locale,
    title: desktopWindowTitle(input.locale),
  }
}
