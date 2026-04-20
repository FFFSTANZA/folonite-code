import { createOpencodeClient } from "@opencode-ai/sdk/v2"
import { useDialog } from "@tui/ui/dialog"
import { DialogSelect } from "@tui/ui/dialog-select"
import { useRoute } from "@tui/context/route"
import { useSync } from "@tui/context/sync"
import { createMemo, createSignal, onMount } from "solid-js"
import { setTimeout as sleep } from "node:timers/promises"
import { errorData, errorMessage } from "@/util/error"
import { Log } from "@/util/log"
import { useSDK } from "../context/sdk"
import { useToast } from "../ui/toast"

type Adaptor = {
  type: string
  name: string
  description: string
}

const log = Log.Default.clone().tag("service", "tui-workspace")

export function isAdaptorList(value: unknown): value is Adaptor[] {
  return Array.isArray(value) && value.every((item) => {
    if (!item || typeof item !== "object") return false
    const adaptor = item as Record<string, unknown>
    return typeof adaptor.type === "string" && typeof adaptor.name === "string" && typeof adaptor.description === "string"
  })
}

export async function loadWorkspaceAdaptors(fetchImpl: typeof fetch, url: URL) {
  const response = await fetchImpl(url).catch(() => undefined)
  if (!response?.ok) return
  const data = await response.json().catch(() => undefined)
  if (!isAdaptorList(data)) return
  return data
}

function scoped(sdk: ReturnType<typeof useSDK>, sync: ReturnType<typeof useSync>, workspaceID: string) {
  return createOpencodeClient({
    baseUrl: sdk.url,
    fetch: sdk.fetch,
    directory: sync.path.directory || sdk.directory,
    experimental_workspaceID: workspaceID,
  })
}

export async function openWorkspaceSession(input: {
  dialog: ReturnType<typeof useDialog>
  route: ReturnType<typeof useRoute>
  sdk: ReturnType<typeof useSDK>
  sync: ReturnType<typeof useSync>
  toast: ReturnType<typeof useToast>
  workspaceID: string
}) {
  const client = scoped(input.sdk, input.sync, input.workspaceID)
  const maxAttempts = 3
  log.info("workspace session create requested", {
    workspaceID: input.workspaceID,
  })

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const result = await client.session.create({ workspace: input.workspaceID }).catch((err) => {
      log.error("workspace session create request failed", {
        workspaceID: input.workspaceID,
        error: errorData(err),
      })
      return undefined
    })
    if (!result) {
      input.toast.show({
        message: "Failed to create workspace session",
        variant: "error",
      })
      return
    }
    log.info("workspace session create response", {
      workspaceID: input.workspaceID,
      status: result.response?.status,
      sessionID: result.data?.id,
    })
    if (result.response?.status && result.response.status >= 500 && result.response.status < 600) {
      if (attempt === maxAttempts) {
        log.error("workspace session create exhausted retries", {
          workspaceID: input.workspaceID,
          status: result.response.status,
          attempts: attempt,
        })
        input.toast.show({
          message: "Failed to create workspace session",
          variant: "error",
        })
        return
      }
      log.warn("workspace session create retrying after server error", {
        workspaceID: input.workspaceID,
        status: result.response.status,
        attempt,
        maxAttempts,
      })
      await sleep(1000)
      continue
    }
    if (!result.data) {
      log.error("workspace session create returned no data", {
        workspaceID: input.workspaceID,
        status: result.response?.status,
      })
      input.toast.show({
        message: "Failed to create workspace session",
        variant: "error",
      })
      return
    }

    input.route.navigate({
      type: "session",
      sessionID: result.data.id,
    })
    log.info("workspace session create complete", {
      workspaceID: input.workspaceID,
      sessionID: result.data.id,
    })
    input.dialog.clear()
    return
  }
}

export function DialogWorkspaceCreate(props: { onSelect: (workspaceID: string) => Promise<void> | void }) {
  const dialog = useDialog()
  const sync = useSync()
  const sdk = useSDK()
  const toast = useToast()
  const [creating, setCreating] = createSignal<string>()
  const [adaptors, setAdaptors] = createSignal<Adaptor[]>()

  onMount(() => {
    dialog.setSize("medium")
    void (async () => {
      const dir = sync.path.directory || sdk.directory
      const url = new URL("/experimental/workspace/adaptor", sdk.url)
      if (dir) url.searchParams.set("directory", dir)
      const res = await loadWorkspaceAdaptors(sdk.fetch, url)
      if (!res) {
        toast.show({
          message: "Failed to load workspace adaptors",
          variant: "error",
        })
        return
      }
      setAdaptors(res)
    })()
  })

  const options = createMemo(() => {
    const type = creating()
    if (type) {
      return [
        {
          title: `Creating ${type} workspace...`,
          value: "creating" as const,
          description: "This can take a while for remote environments",
        },
      ]
    }
    const list = adaptors()
    if (!list) {
      return [
        {
          title: "Loading workspaces...",
          value: "loading" as const,
          description: "Fetching available workspace adaptors",
        },
      ]
    }
    return list.map((item) => ({
      title: item.name,
      value: item.type,
      description: item.description,
    }))
  })

  const create = async (type: string) => {
    if (creating()) return
    setCreating(type)
    log.info("workspace create requested", {
      type,
    })

    const result = await sdk.client.experimental.workspace.create({ type, branch: null }).catch((err) => {
      log.error("workspace create request failed", {
        type,
        error: errorData(err),
      })
      return undefined
    })

    const workspace = result?.data
    if (!workspace) {
      setCreating(undefined)
      log.error("workspace create failed", {
        type,
        status: result?.response.status,
        error: result?.error ? errorData(result.error) : undefined,
      })
      toast.show({
        message: `Failed to create workspace: ${errorMessage(result?.error ?? "no response")}`,
        variant: "error",
      })
      return
    }
    log.info("workspace create response", {
      type,
      workspaceID: workspace.id,
      status: result.response?.status,
    })

    await props.onSelect(workspace.id)
    setCreating(undefined)
  }

  return (
    <DialogSelect
      title={creating() ? "Creating Workspace" : "New Workspace"}
      skipFilter={true}
      options={options()}
      onSelect={(option) => {
        if (option.value === "creating" || option.value === "loading") return
        void create(option.value)
      }}
    />
  )
}
