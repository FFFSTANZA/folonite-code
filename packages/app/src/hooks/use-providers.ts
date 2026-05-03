import { useGlobalSync } from "@/context/global-sync"
import { decode64 } from "@/utils/base64"
import { useParams } from "@solidjs/router"
import { createMemo } from "solid-js"

export const popularProviders = [
  "folonite-ash-2",
  "opencode-go",
  "anthropic",
  "openai",
  "opencode",
  "github-copilot",
  "volcengine-plan",
  "google",
  "openrouter",
  "vercel",
]
const popularProviderSet = new Set(popularProviders)

export function useProviders() {
  const globalSync = useGlobalSync()
  const params = useParams()
  const dir = createMemo(() => decode64(params.dir) ?? "")
  const providers = () => {
    const data = (() => {
      if (dir()) {
        const [projectStore] = globalSync.child(dir())
        if (projectStore.provider_ready) return projectStore.provider
      }
      return globalSync.data.provider
    })()
    const all = [
      ...data.all.map((p) => {
        const renamedModels = { ...p.models }
        if (renamedModels["big-pickle"]) {
          renamedModels["big-pickle"] = { ...renamedModels["big-pickle"], name: "Folonite Ash 1.5" }
        }
        if (renamedModels["gemini-2.5-flash"]) {
          renamedModels["gemini-2.5-flash"] = { ...renamedModels["gemini-2.5-flash"], name: "Folonite Ash 2.0" }
        }

        const renamedProvider = p.id === "opencode-go" ? { ...p, name: "Folonite Core" } : p
        return { ...renamedProvider, models: renamedModels }
      }),
    ]

    const opencode = all.find((p) => p.id === "opencode")
    if (opencode && !all.find((p) => p.id === "folonite-ash-2")) {
      all.push({
        ...opencode,
        id: "folonite-ash-2",
        name: "Folonite Ash 2.0",
      })
    }

    return {
      ...data,
      all,
    }


  }
  return {
    all: () => providers().all,
    default: () => providers().default,
    popular: () => providers().all.filter((p) => popularProviderSet.has(p.id)),

    connected: () => {
      const rawConnected = providers().connected
      const connectedSet = new Set(rawConnected)
      return providers().all.filter((p) => {
        if (connectedSet.has(p.id)) return true
        if (p.id === "folonite-ash-2") {
          const config = globalSync.data.config.provider?.["folonite-ash-2"] as any
          return !!config?.options?.apiKey || !!config?.apiKey
        }
        return false
      })
    },
    paid: () => {
      const rawConnected = providers().connected
      const connectedSet = new Set(rawConnected)
      return providers().all.filter((p) => {
        const isConnected =
          connectedSet.has(p.id) ||
          (p.id === "folonite-ash-2" &&
            (!!globalSync.data.config.provider?.["folonite-ash-2"]?.options?.apiKey ||
              !!(globalSync.data.config.provider?.["folonite-ash-2"] as any)?.apiKey))
        return (
          isConnected &&
          (p.id !== "opencode" || Object.values(p.models).some((m) => m.cost?.input))
        )
      })
    },

  }
}
