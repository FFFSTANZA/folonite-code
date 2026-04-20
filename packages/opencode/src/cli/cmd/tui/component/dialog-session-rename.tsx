import { DialogPrompt } from "@tui/ui/dialog-prompt"
import { useDialog } from "@tui/ui/dialog"
import { useSync } from "@tui/context/sync"
import { createMemo } from "solid-js"
import { errorMessage } from "@/util/error"
import { useSDK } from "../context/sdk"
import { useToast } from "../ui/toast"

interface DialogSessionRenameProps {
  session: string
}

export function DialogSessionRename(props: DialogSessionRenameProps) {
  const dialog = useDialog()
  const sync = useSync()
  const sdk = useSDK()
  const toast = useToast()
  const session = createMemo(() => sync.session.get(props.session))

  return (
    <DialogPrompt
      title="Rename Session"
      value={session()?.title}
      onConfirm={(value) => {
        void sdk.client.session.update({
          sessionID: props.session,
          title: value,
        }).catch((error) => {
          toast.show({
            variant: "error",
            title: "Failed to rename session",
            message: errorMessage(error),
          })
        })
        dialog.clear()
      }}
      onCancel={() => dialog.clear()}
    />
  )
}
