import { useParams } from "@solidjs/router"
import { createMemo } from "solid-js"
import { useLayout } from "@/context/layout"
import { createStableLayoutMemo } from "./stable-layout-memo"

export const useSessionKey = () => {
  const params = useParams()
  const sessionKey = createMemo(() => `${params.dir}${params.id ? "/" + params.id : ""}`)
  return { params, sessionKey }
}

export const useSessionLayout = () => {
  const layout = useLayout()
  const { params, sessionKey } = useSessionKey()
  return {
    params,
    sessionKey,
    tabs: createStableLayoutMemo(() => layout.tabs(sessionKey)),
    view: createStableLayoutMemo(() => layout.view(sessionKey)),
  }
}
