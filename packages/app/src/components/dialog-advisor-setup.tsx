import { createMemo, createSignal, Match, Switch } from "solid-js"
import { Dialog } from "@async-coder/ui/dialog"
import { List } from "@async-coder/ui/list"
import { ProviderIcon } from "@async-coder/ui/provider-icon"
import { showToast } from "@async-coder/ui/toast"
import { useDialog } from "@async-coder/ui/context/dialog"
import { useGlobalSync } from "@/context/global-sync"
import { useProviders } from "@/hooks/use-providers"
import { advisorConfig, advisorProviders, advisorVariantOptions, ollamaLocalPreset } from "./dialog-advisor-setup-state"
import { useLanguage } from "@/context/language"
import { DialogConnectProvider } from "./dialog-connect-provider"
import { DialogCustomProvider } from "./dialog-custom-provider"

export function DialogAdvisorSetup(props: {
  onConfigured?: () => void
  initialProviderID?: string
  initialStep?: "provider" | "model"
}) {
  const dialog = useDialog()
  const globalSync = useGlobalSync()
  const providers = useProviders()
  const language = useLanguage()
  const [step, setStep] = createSignal<"provider" | "model" | "variant">(props.initialStep ?? "provider")
  const [providerID, setProviderID] = createSignal(props.initialProviderID ?? "")
  const [modelID, setModelID] = createSignal("")
  const providerCatalog = createMemo(() => {
    const catalog = new Map(providers.all().map((item) => [item.id, item]))
    const connected = new Set(globalSync.data.provider.connected)
    globalSync.data.provider.all.forEach((item) => {
      if (connected.has(item.id) || !catalog.has(item.id)) catalog.set(item.id, item)
    })
    return [...catalog.values()]
  })
  const provider = createMemo(() => providerCatalog().find((item) => item.id === providerID()))
  const models = createMemo(() =>
    Object.values(provider()?.models ?? {}).map((item) => ({ ...item, provider: provider()! })),
  )
  const model = createMemo(() => models().find((item) => item.id === modelID()))
  const connected = createMemo(
    () => new Set([...providers.connected().map((item) => item.id), ...globalSync.data.provider.connected]),
  )
  const rows = createMemo(() => [
    ...advisorProviders(providerCatalog(), [...connected()]).map((item) => ({
      kind: "provider" as const,
      id: item.id,
      name: item.name,
      status: item.status,
    })),
    {
      kind: "ollama" as const,
      id: "__ollama__",
      name: language.t("dialog.advisor.provider.ollama"),
      status: "local" as const,
    },
    {
      kind: "custom" as const,
      id: "__custom__",
      name: language.t("provider.custom.title"),
      status: "local" as const,
    },
  ])

  const reopen = (next: "provider" | "model", selected?: string) => {
    dialog.show(() => (
      <DialogAdvisorSetup onConfigured={props.onConfigured} initialStep={next} initialProviderID={selected} />
    ))
  }

  const connect = (selected: string) => {
    dialog.show(
      () => (
        <DialogConnectProvider
          provider={selected}
          onConnected={(id) => reopen("model", id)}
          onCancel={() => reopen("provider")}
        />
      ),
      () => reopen("provider"),
    )
  }

  const custom = (preset?: { providerID: string; name: string; baseURL: string }) => {
    dialog.show(
      () => (
        <DialogCustomProvider
          back="close"
          preset={preset}
          onConnected={(id) => reopen("model", id)}
          onCancel={() => reopen("provider")}
        />
      ),
      () => reopen("provider"),
    )
  }
  const title = createMemo(() => {
    if (step() === "provider") return language.t("dialog.advisor.provider.title")
    if (step() === "model")
      return language.t("dialog.advisor.model.title", { provider: provider()?.name ?? providerID() })
    return language.t("dialog.advisor.variant.title", { model: model()?.name ?? modelID() })
  })

  const save = async (variant: string) => {
    const saved = await globalSync
      .updateConfig(advisorConfig(providerID(), modelID(), variant))
      .then(() => true)
      .catch((error) => {
        showToast({
          title: language.t("dialog.advisor.error.title"),
          description: error instanceof Error ? error.message : String(error),
        })
        return false
      })
    if (!saved) return
    dialog.close()
    props.onConfigured?.()
  }

  return (
    <Dialog title={title()} transition>
      <Switch>
        <Match when={step() === "provider"}>
          <List
            search={{ placeholder: language.t("dialog.advisor.provider.search"), autofocus: true }}
            emptyMessage={language.t("dialog.advisor.provider.empty")}
            key={(item) => item?.id}
            items={rows}
            filterKeys={["id", "name"]}
            sortBy={(a, b) => a.name.localeCompare(b.name)}
            onSelect={(item) => {
              if (!item) return
              if (item.kind === "ollama") {
                custom(ollamaLocalPreset())
                return
              }
              if (item.kind === "custom") {
                custom()
                return
              }
              if (item.status === "setup_required") {
                connect(item.id)
                return
              }
              setProviderID(item.id)
              setStep("model")
            }}
          >
            {(item) => (
              <div class="px-1.25 w-full flex items-center gap-x-3">
                <ProviderIcon id={item.kind === "custom" ? "synthetic" : item.kind === "ollama" ? "ollama" : item.id} />
                <div class="min-w-0 flex-1">
                  <div class="text-14-medium text-text-strong truncate">{item.name}</div>
                  <div class="text-12-regular text-text-weak truncate">
                    {item.status === "connected"
                      ? language.t("dialog.advisor.provider.connected")
                      : item.status === "local"
                        ? language.t("dialog.advisor.provider.local")
                        : language.t("dialog.advisor.provider.setupRequired")}
                  </div>
                </div>
              </div>
            )}
          </List>
        </Match>
        <Match when={step() === "model"}>
          <List
            search={{ placeholder: language.t("dialog.advisor.model.search"), autofocus: true }}
            emptyMessage={language.t("dialog.advisor.model.empty")}
            key={(item) => `${item?.provider.id}:${item?.id}`}
            items={() =>
              models()
                .filter((item) => item.status !== "deprecated")
                .filter((item) => item.capabilities.output.text)
            }
            filterKeys={["name", "id"]}
            sortBy={(a, b) => a.name.localeCompare(b.name)}
            onSelect={(item) => {
              if (!item) return
              setModelID(item.id)
              setStep("variant")
            }}
          >
            {(item) => <div class="px-1.25 w-full text-13-regular truncate">{item.name}</div>}
          </List>
        </Match>
        <Match when={step() === "variant"}>
          <List
            key={(item) => item}
            items={() => advisorVariantOptions(model()?.variants)}
            current="default"
            onSelect={(variant) => {
              if (!variant) return
              void save(variant)
            }}
          >
            {(variant) => (
              <div class="px-1.25 w-full">
                <div class="text-13-regular text-text-strong">
                  {variant === "default" ? language.t("dialog.advisor.variant.default") : variant}
                </div>
                {variant === "default" && Object.keys(model()?.variants ?? {}).length === 0 ? (
                  <div class="text-12-regular text-text-weak">{language.t("dialog.advisor.variant.unsupported")}</div>
                ) : null}
              </div>
            )}
          </List>
        </Match>
      </Switch>
    </Dialog>
  )
}
