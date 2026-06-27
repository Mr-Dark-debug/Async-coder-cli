import { createMemo, createSignal, Match, Switch } from "solid-js"
import { useDialog } from "@tui/ui/dialog"
import { DialogSelect } from "@tui/ui/dialog-select"
import { useSDK } from "@tui/context/sdk"
import { useSync } from "@tui/context/sync"
import { useToast } from "@tui/ui/toast"
import { useLanguage } from "@tui/context/language"

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

export function DialogAdvisorSetup(props: { onConfigured?: () => void }) {
  const dialog = useDialog()
  const sdk = useSDK()
  const sync = useSync()
  const toast = useToast()
  const t = useLanguage().t
  const [step, setStep] = createSignal<"provider" | "model" | "variant">("provider")
  const [providerID, setProviderID] = createSignal("")
  const [modelID, setModelID] = createSignal("")
  const provider = createMemo(() => sync.data.provider.find((item) => item.id === providerID()))
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

  return (
    <Switch>
      <Match when={step() === "provider"}>
        <DialogSelect
          title={t("tui.dialog.advisor.provider.title")}
          options={sync.data.provider
            .filter((item) => Object.values(item.models).some((candidate) => candidate.status !== "deprecated"))
            .map((item) => ({
              title: item.name,
              value: item.id,
              description: t("tui.dialog.advisor.provider.description"),
              onSelect: () => {
                setProviderID(item.id)
                setStep("model")
              },
            }))}
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
