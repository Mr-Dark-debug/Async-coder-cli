import { createMemo, createSignal, Match, Switch } from "solid-js"
import { Dialog } from "@async-coder/ui/dialog"
import { List } from "@async-coder/ui/list"
import { ProviderIcon } from "@async-coder/ui/provider-icon"
import { showToast } from "@async-coder/ui/toast"
import { useDialog } from "@async-coder/ui/context/dialog"
import { useGlobalSync } from "@/context/global-sync"
import { useModels } from "@/context/models"
import { useProviders } from "@/hooks/use-providers"
import { advisorConfig, advisorVariantOptions } from "./dialog-advisor-setup-state"
import { useLanguage } from "@/context/language"

export function DialogAdvisorSetup(props: { onConfigured?: () => void }) {
  const dialog = useDialog()
  const globalSync = useGlobalSync()
  const providers = useProviders()
  const models = useModels()
  const language = useLanguage()
  const [step, setStep] = createSignal<"provider" | "model" | "variant">("provider")
  const [providerID, setProviderID] = createSignal("")
  const [modelID, setModelID] = createSignal("")
  const provider = createMemo(() => providers.connected().find((item) => item.id === providerID()))
  const model = createMemo(() =>
    models.list().find((item) => item.provider.id === providerID() && item.id === modelID()),
  )
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
            items={() => providers.connected().filter((item) => Object.keys(item.models).length > 0)}
            filterKeys={["id", "name"]}
            sortBy={(a, b) => a.name.localeCompare(b.name)}
            onSelect={(item) => {
              if (!item) return
              setProviderID(item.id)
              setStep("model")
            }}
          >
            {(item) => (
              <div class="px-1.25 w-full flex items-center gap-x-3">
                <ProviderIcon id={item.id} />
                <div class="min-w-0 flex-1">
                  <div class="text-14-medium text-text-strong truncate">{item.name}</div>
                  <div class="text-12-regular text-text-weak truncate">
                    {language.t("dialog.advisor.provider.description")}
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
              models
                .list()
                .filter((item) => item.provider.id === providerID())
                .filter((item) => item.status !== "deprecated")
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
