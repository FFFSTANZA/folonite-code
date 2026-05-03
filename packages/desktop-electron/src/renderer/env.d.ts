import type { ElectronAPI } from "../preload/types"

declare global {
  interface Window {
    api: ElectronAPI
    __FOLONITE__?: {
      // Runtime deep-link buffer only; initial deep links come from startup-state IPC.
      deepLinks?: string[]
    }
  }
}
