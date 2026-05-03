import { app } from "electron"
import { FOLONITE_RUNTIME } from "./runtime-namespace"
export { FEEDBACK_FORM_URL } from "./support-links"

type Channel = "dev" | "beta" | "prod"
const raw = import.meta.env.FOLONITE_CHANNEL
export const CHANNEL: Channel = raw === "dev" || raw === "beta" || raw === "prod" ? raw : "dev"

export const SETTINGS_STORE = FOLONITE_RUNTIME.settingsStore
export const DEFAULT_SERVER_URL_KEY = "defaultServerUrl"
export const WSL_ENABLED_KEY = "wslEnabled"
export const UPDATER_ENABLED = app.isPackaged && CHANNEL !== "dev"
