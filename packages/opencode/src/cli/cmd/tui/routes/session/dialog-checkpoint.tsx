import { createMemo, createResource, createSignal } from "solid-js"
import { useSDK } from "@tui/context/sdk"
import { useSync } from "@tui/context/sync"
import { useDialog } from "@tui/ui/dialog"
import { DialogSelect } from "@tui/ui/dialog-select"
import { DialogPrompt } from "@tui/ui/dialog-prompt"
import { useToast } from "@tui/ui/toast"
import type { SessionCheckpointSummary } from "@async-coder/sdk/v2"

export function DialogCheckpoint(props: { sessionID: string; rewind?: boolean }) {
  const sdk = useSDK()
  const sync = useSync()
  const dialog = useDialog()
  const toast = useToast()
  const [busy, setBusy] = createSignal(false)
  const [checkpoints, { refetch }] = createResource(async () => {
    const result = await sdk.client.session.checkpointList({ sessionID: props.sessionID }, { throwOnError: true })
    return result.data
  })
  const idle = () => (sync.data.session_status[props.sessionID]?.type ?? "idle") === "idle"
  const fail = (error: unknown) => { setBusy(false); toast.show({ message: error instanceof Error ? error.message : String(error), variant: "error" }) }

  async function restore(checkpoint: SessionCheckpointSummary, files?: string[]) {
    if (!idle()) { toast.show({ message: "Stop the agent before rewinding.", variant: "warning" }); return }
    setBusy(true)
    // Capture the current conversation/files first so a rewind has a recovery point.
    await sdk.client.session.checkpointCreate({ sessionID: props.sessionID, description: `Before rewind to ${checkpoint.description}`, files: files ?? checkpoint.files }, { throwOnError: true })
    const result = await sdk.client.session.checkpointRestore({ sessionID: props.sessionID, checkpointID: checkpoint.id, files }, { throwOnError: true })
    setBusy(false)
    dialog.clear()
    toast.show({ message: `Restored ${result.data.restored.length} files and ${result.data.messageCount} messages; preserved ${result.data.preserved.length} unrelated changes.`, variant: "success" })
  }

  function detail(checkpoint: SessionCheckpointSummary) {
    const files = (checkpoints() ?? []).filter((item) => item.time_created >= checkpoint.time_created).flatMap((item) => item.files)
    dialog.replace(() => <DialogSelect title={checkpoint.description} options={[
      { title: "Rewind agent changes and conversation", value: "all", description: "Preserve unrelated file changes", onSelect: () => { void restore(checkpoint).catch(fail) } },
      { title: "Rewind a specific file and conversation", value: "file", disabled: files.length === 0, onSelect: () => dialog.replace(() => <DialogSelect title="Choose a file to restore" options={[...new Set(files)].map((file) => ({ title: file, value: file }))} onSelect={(option) => { void restore(checkpoint, [option.value]).catch(fail) }} />) },
    ]} />)
  }

  const options = createMemo(() => [
    ...(!props.rewind ? [{ title: "+ Create checkpoint", value: "create", description: "Save current files and conversation", disabled: !idle() || busy() }] : []),
    ...(checkpoints() ?? []).map((checkpoint) => ({
      title: checkpoint.description, value: checkpoint.id,
      description: `${new Date(checkpoint.time_created).toLocaleString()} · ${checkpoint.messages} messages · ${checkpoint.files.length} files${checkpoint.automatic ? " · automatic" : ""}`,
      disabled: busy(),
    })),
  ])
  return <DialogSelect title={busy() ? "Restoring checkpoint..." : props.rewind ? "Rewind to checkpoint" : "Checkpoints"} options={options()} onSelect={(option) => {
    if (busy()) return
    if (option.value === "create") {
      void (async () => {
        const description = await DialogPrompt.show(dialog, "Checkpoint description", { placeholder: "Before refactoring" })
        if (description === null) return
        await sdk.client.session.checkpointCreate({ sessionID: props.sessionID, description: description || "Manual checkpoint" }, { throwOnError: true })
        toast.show({ message: "Checkpoint created.", variant: "success" })
        void refetch()
        dialog.replace(() => <DialogCheckpoint sessionID={props.sessionID} />)
      })().catch(fail)
      return
    }
    const checkpoint = checkpoints()?.find((item) => item.id === option.value)
    if (checkpoint) detail(checkpoint)
  }} />
}
