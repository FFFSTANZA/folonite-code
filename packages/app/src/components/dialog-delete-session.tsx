import { Dialog } from "@opencode-ai/ui/dialog"
import { Button } from "@opencode-ai/ui/button"
import { useDialog } from "@opencode-ai/ui/context/dialog"
import { createMemo, createSignal } from "solid-js"
import { useLanguage } from "@/context/language"
import { useSync } from "@/context/sync"
import { sessionTitle } from "@/utils/session-title"

export function DialogDeleteSession(props: {
  sessionID: string
  onConfirm: () => Promise<void> | void
}) {
  const sync = useSync()
  const language = useLanguage()
  const dialog = useDialog()
  const [deleting, setDeleting] = createSignal(false)

  const name = createMemo(
    () => sessionTitle(sync.session.get(props.sessionID)?.title) ?? language.t("command.session.new"),
  )

  const handleDelete = async () => {
    if (deleting()) return
    setDeleting(true)
    try {
      await props.onConfirm()
      dialog.close()
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Dialog title={language.t("session.delete.title")} fit>
      <div class="flex flex-col gap-4 pl-6 pr-2.5 pb-3">
        <div class="flex flex-col gap-1">
          <span class="text-13-regular text-text-strong">
            {language.t("session.delete.confirm", { name: name() })}
          </span>
        </div>
        <div class="flex justify-end gap-2">
          <Button variant="ghost" size="large" onClick={() => dialog.close()} disabled={deleting()}>
            {language.t("common.cancel")}
          </Button>
          <Button variant="primary" size="large" onClick={handleDelete} disabled={deleting()}>
            {language.t("common.delete")}
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
