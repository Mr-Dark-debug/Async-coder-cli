import { createMemo, createSignal, Match, Switch } from "solid-js"
import { useDialog } from "@tui/ui/dialog"
import { DialogSelect } from "@tui/ui/dialog-select"
import { useSDK } from "@tui/context/sdk"
import { useSync } from "@tui/context/sync"
import { useToast } from "@tui/ui/toast"
import { useLanguage } from "@tui/context/language"
import { DialogProvider, runCustomProviderWizard } from "./dialog-provider"

type Advisor = { model: string; variant?: string }

export function needsAdvisorSetup(input: string, advisor: Advisor | undefined) {
  return input.trim().split(/\s+/, 1)[0] === "/consult" && !advisor?.model
}

export function advisorConfig(providerID: string, modelID: string, variant: string) {
  return {
    advisor: {
      model: `${providerID}/${modelID}`,
      ...(variant === "default" ? {} : { variant }),
    },
  }
}

export function advisorVariantOptions(variants: Record<string, unknown> | undefined) {
  return ["default", ...Object.keys(variants ?? {}).sort()]
}

export function advisorProviderOptions(providers: { id: string; name: string }[], connected: string[]) {
  return providers.map((provider) => ({
    id: provider.id,
    name: provider.name,
    status: connected.includes(provider.id) ? ("connected" as const) : ("setup_required" as const),
  }))
}

export function advisorResume(providerID: string, result: "connected" | "cancelled") {
  if (result === "connected") return { providerID, step: "model" as const }
  return { step: "provider" as const }
}

export function advisorOllamaPreset() {
  return {
    providerID: "ollama",
    name: "Ollama",
    baseURL: "http://localhost:11434/v1",
  }
}

export function DialogAdvisorSetup(props: { onConfigured?: () => void; providerID?: string }) {
  const dialog = useDialog()
  const sdk = useSDK()
  const sync = useSync()
  const toast = useToast()
  const t = useLanguage().t
  const [step, setStep] = createSignal<"provider" | "model" | "variant">(props.providerID ? "model" : "provider")
  const [providerID, setProviderID] = createSignal(props.providerID ?? "")
  const [modelID, setModelID] = createSignal("")
  const provider = createMemo(() => sync.data.provider_next.all.find((item) => item.id === providerID()))
  const model = createMemo(() => provider()?.models[modelID()])

  const save = async (variant: string) => {
    const result = await sdk.client.global.config.update({
      config: advisorConfig(providerID(), modelID(), variant),
    })
    if (result.error) {
      toast.show({ variant: "error", message: JSON.stringify(result.error) })
      return
    }
    await sdk.client.instance.dispose()
    await sync.bootstrap()
    dialog.clear()
    props.onConfigured?.()
  }

  const resume = (nextProviderID: string) => {
    dialog.replace(() => <DialogAdvisorSetup providerID={nextProviderID} onConfigured={props.onConfigured} />)
  }

  const cancel = () => {
    dialog.replace(() => <DialogAdvisorSetup onConfigured={props.onConfigured} />)
  }

  const connect = (nextProviderID: string) => {
    dialog.replace(() => <DialogProvider providerID={nextProviderID} onConnected={resume} onCancel={cancel} />)
  }

  return (
    <Switch>
      <Match when={step() === "provider"}>
        <DialogSelect
          title={t("tui.dialog.advisor.provider.title")}
          options={advisorProviderOptions(sync.data.provider_next.all, sync.data.provider_next.connected)
            .map((item) => ({
              title: item.name,
              value: item.id,
              description:
                item.status === "connected"
                  ? t("tui.dialog.advisor.provider.connected")
                  : t("tui.dialog.advisor.provider.setup_required"),
              onSelect: () => {
                setProviderID(item.id)
                if (item.status === "setup_required") return connect(item.id)
                setStep("model")
              },
            }))
            .concat([
              {
                title: t("tui.dialog.advisor.provider.ollama"),
                value: "__ollama__",
                description: t("tui.dialog.advisor.provider.ollama.description"),
                onSelect: () =>
                  void runCustomProviderWizard({
                    dialog,
                    sdk,
                    sync,
                    toast,
                    destination: { onConnected: resume, onCancel: cancel },
                    preset: advisorOllamaPreset(),
                  }),
              },
              {
                title: t("tui.dialog.advisor.provider.custom"),
                value: "__custom__",
                description: t("tui.dialog.advisor.provider.custom.description"),
                onSelect: () =>
                  void runCustomProviderWizard({
                    dialog,
                    sdk,
                    sync,
                    toast,
                    destination: { onConnected: resume, onCancel: cancel },
                  }),
              },
            ])}
        />
      </Match>
      <Match when={step() === "model"}>
        <DialogSelect
          title={t("tui.dialog.advisor.model.title", { provider: provider()?.name ?? providerID() })}
          options={Object.values(provider()?.models ?? {})
            .filter((item) => item.status !== "deprecated")
            .sort((a, b) => (a.name ?? a.id).localeCompare(b.name ?? b.id))
            .map((item) => ({
              title: item.name ?? item.id,
              value: item.id,
              onSelect: () => {
                setModelID(item.id)
                setStep("variant")
              },
            }))}
        />
      </Match>
      <Match when={step() === "variant"}>
        <DialogSelect
          title={t("tui.dialog.advisor.variant.title", { model: model()?.name ?? modelID() })}
          options={advisorVariantOptions(model()?.variants).map((variant) => ({
            title: variant === "default" ? t("tui.dialog.advisor.variant.default") : variant,
            value: variant,
            description:
              variant === "default" && Object.keys(model()?.variants ?? {}).length === 0
                ? t("tui.dialog.advisor.variant.unsupported")
                : undefined,
            onSelect: () => void save(variant),
          }))}
        />
      </Match>
    </Switch>
  )
}
