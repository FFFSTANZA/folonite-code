import type { DesktopTheme } from "./types"
import foloniteThemeJson from "./themes/folonite.json"

export const foloniteTheme = foloniteThemeJson as DesktopTheme

export const DEFAULT_THEMES: Record<string, DesktopTheme> = {
  folonite: foloniteTheme,
}
