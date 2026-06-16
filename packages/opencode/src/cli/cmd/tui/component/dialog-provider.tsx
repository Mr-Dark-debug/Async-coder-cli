import { createMemo, createSignal, onMount, Show } from "solid-js"
import { useSync } from "@tui/context/sync"
import { map, pipe, sortBy } from "remeda"
import { DialogSelect } from "@tui/ui/dialog-select"
import { useDialog, type DialogContext } from "@tui/ui/dialog"
import { useSDK } from "../context/sdk"
import { DialogPrompt } from "../ui/dialog-prompt"
import { Link } from "../ui/link"
import { useTheme } from "../context/theme"
import { TextAttributes } from "@opentui/core"
import type { ProviderAuthAuthorization, ProviderAuthMethod } from "@async-coder/sdk/v2"
import { DialogModel } from "./dialog-model"
import { useKeyboard } from "@opentui/solid"
import * as Clipboard from "@tui/util/clipboard"
import { useToast, type ToastContext } from "../ui/toast"
import { isConsoleManagedProvider } from "@tui/util/provider-origin"

const PROVIDER_PRIORITY: Record<string, number> = {
  groq: 0,
  openrouter: 1,
  openai: 2,
  anthropic: 3,
  google: 4,
  xai: 5,
  "github-copilot": 6,
}
const HIDDEN_PROVIDER_IDS = ["xi" + "ao" + "mi", "mi" + "mo", "opencode", "opencode-go"]

export function createDialogProviderOptions() {
  const sync = useSync()
  const dialog = useDialog()
  const sdk = useSDK()
  const toast = useToast()
  const { theme } = useTheme()
  const options = createMemo(() => {
    const list = pipe(
      sync.data.provider_next.all.filter((provider) => !HIDDEN_PROVIDER_IDS.includes(provider.id)),
      sortBy((x) => PROVIDER_PRIORITY[x.id] ?? 99),
      map((provider) => {
        const consoleManaged = isConsoleManagedProvider(sync.data.console_state.consoleManagedProviders, provider.id)
        const connected = sync.data.provider_next.connected.includes(provider.id)

        return {
          title: provider.name,
          value: provider.id,
          description: {
            groq: "Fast inference, free tier - get a key at console.groq.com/keys",
            openrouter: "One API key, hundreds of models - openrouter.ai/keys",
            openai: "ChatGPT Plus/Pro or API key - platform.openai.com",
            anthropic: "Claude API key - console.anthropic.com",
            google: "Gemini API key - aistudio.google.com",
            xai: "Grok API key - x.ai/api",
            "github-copilot": "GitHub Copilot subscription",
          }[provider.id],
          footer: consoleManaged ? sync.data.console_state.activeOrgName : undefined,
          category: provider.id in PROVIDER_PRIORITY ? "Popular" : "Other",
          gutter: connected ? <text fg={theme.success}>✓</text> : undefined,
          async onSelect() {
            if (consoleManaged) return

            const methods = sync.data.provider_auth[provider.id] ?? [
              {
                type: "api",
                label: "API key",
              },
            ]
            let index: number | null = 0
            if (methods.length > 1) {
              index = await new Promise<number | null>((resolve) => {
                dialog.replace(
                  () => (
                    <DialogSelect
                      title="Select auth method"
                      options={methods.map((x, index) => ({
                        title: x.label,
                        value: index,
                      }))}
                      onSelect={(option) => resolve(option.value)}
                    />
                  ),
                  () => resolve(null),
                )
              })
            }
            if (index == null) return
            const method = methods[index]
            if (method.type === "oauth") {
              let inputs: Record<string, string> | undefined
              if (method.prompts?.length) {
                const value = await PromptsMethod({
                  dialog,
                  prompts: method.prompts,
                })
                if (!value) return
                inputs = value
              }

              const result = await sdk.client.provider.oauth.authorize({
                providerID: provider.id,
                method: index,
                inputs,
              })
              if (result.error) {
                toast.show({
                  variant: "error",
                  message: JSON.stringify(result.error),
                })
                dialog.clear()
                return
              }
              if (result.data?.method === "code") {
                dialog.replace(() => (
                  <CodeMethod
                    providerID={provider.id}
                    title={method.label}
                    index={index}
                    authorization={result.data!}
                  />
                ))
              }
              if (result.data?.method === "auto") {
                dialog.replace(() => (
                  <AutoMethod
                    providerID={provider.id}
                    title={method.label}
                    index={index}
                    authorization={result.data!}
                  />
                ))
              }
            }
            if (method.type === "api") {
              let metadata: Record<string, string> | undefined
              if (method.prompts?.length) {
                const value = await PromptsMethod({ dialog, prompts: method.prompts })
                if (!value) return
                metadata = value
              }
              return dialog.replace(() => (
                <ApiMethod providerID={provider.id} title={method.label} metadata={metadata} />
              ))
            }
          },
        }
      }),
    )
    return [
      ...list,
      {
        title: "Tavily",
        value: "__search_tavily__",
        description: "Web search API key - 1k free searches/month",
        footer: undefined,
        category: "Web Search",
        gutter: undefined,
        async onSelect() {
          await runSearchAuthWizard({ dialog, sdk, sync, toast, providerID: "tavily", title: "Tavily API key" })
        },
      },
      {
        title: "Brave Search",
        value: "__search_brave__",
        description: "Web search API key - 2k free queries/month",
        footer: undefined,
        category: "Web Search",
        gutter: undefined,
        async onSelect() {
          await runSearchAuthWizard({ dialog, sdk, sync, toast, providerID: "brave", title: "Brave Search API key" })
        },
      },
      {
        title: "Google Custom Search",
        value: "__search_google__",
        description: "Requires GOOGLE_API_KEY and GOOGLE_CSE_ID",
        footer: undefined,
        category: "Web Search",
        gutter: undefined,
        async onSelect() {
          await runGoogleSearchAuthWizard({ dialog, sdk, sync, toast })
        },
      },
      {
        title: "Custom Provider",
        value: "__custom__",
        description: "OpenAI-compatible endpoint",
        footer: undefined,
        category: "Other",
        gutter: undefined,
        async onSelect() {
          await runCustomProviderWizard({ dialog, sdk, sync, toast })
        },
      },
    ]
  })
  return options
}

export function DialogProvider() {
  const options = createDialogProviderOptions()
  return <DialogSelect title="Connect a provider" options={options()} />
}

export async function runCustomProviderWizard(opts: {
  dialog: DialogContext
  sdk: ReturnType<typeof useSDK>
  sync: ReturnType<typeof useSync>
  toast: ToastContext
}) {
  const { dialog, sdk, sync, toast } = opts

  function step(n: number, total: number, title: string, placeholder?: string, value?: string) {
    return DialogPrompt.show(dialog, `${title} (${n}/${total})`, { placeholder, value })
  }

  const total = 9
  const providerIDRaw = await step(1, total, "Provider id", "e.g. my-local-llama")
  if (providerIDRaw === null) return
  const providerID = providerIDRaw.trim()
  if (!providerID) return

  const nameRaw = await step(2, total, "Display name", "e.g. My Local Llama", providerID)
  if (nameRaw === null) return
  const name = nameRaw.trim() || providerID

  const baseURLRaw = await step(3, total, "Base URL", "http://localhost:11434/v1")
  if (baseURLRaw === null) return
  const baseURL = baseURLRaw.trim()
  if (!baseURL) return

  const apiKeyRaw = await step(4, total, "API key", "optional")
  if (apiKeyRaw === null) return
  const apiKey = apiKeyRaw.trim()

  const modelIDsRaw = await step(5, total, "Model IDs", "llama3.1:70b, qwen2.5:32b")
  if (modelIDsRaw === null) return
  const modelIDs = modelIDsRaw
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
  if (!modelIDs.length) return

  const inputCostRaw = await step(6, total, "Cost input USD / 1M", "blank for free")
  if (inputCostRaw === null) return
  const outputCostRaw = await step(7, total, "Cost output USD / 1M", "blank for free")
  if (outputCostRaw === null) return
  const cacheReadCostRaw = await step(8, total, "Cost cache read USD / 1M", "blank for free")
  if (cacheReadCostRaw === null) return
  const cacheWriteCostRaw = await step(9, total, "Cost cache write USD / 1M", "blank for free")
  if (cacheWriteCostRaw === null) return

  const cost = {
    input: Number(inputCostRaw.trim() || 0),
    output: Number(outputCostRaw.trim() || 0),
    cache_read: Number(cacheReadCostRaw.trim() || 0),
    cache_write: Number(cacheWriteCostRaw.trim() || 0),
  }
  const hasCost = cost.input > 0 || cost.output > 0 || cost.cache_read > 0 || cost.cache_write > 0

  const envKey = `${providerID.toUpperCase().replace(/[^A-Z0-9]+/g, "_")}_API_KEY`
  const patch = {
    provider: {
      [providerID]: {
        name,
        npm: "@ai-sdk/openai-compatible",
        env: [envKey],
        options: {
          baseURL,
          setCacheKey: true,
        },
        models: Object.fromEntries(
          modelIDs.map((modelID) => [
            modelID,
            {
              name: modelID,
              ...(hasCost ? { cost } : {}),
            },
          ]),
        ),
      },
    },
  } as const

  const updateRes = await sdk.client.global.config.update({ config: patch as any })
  if (updateRes.error) {
    toast.show({ variant: "error", message: JSON.stringify(updateRes.error) })
    return
  }

  if (apiKey) {
    const authRes = await sdk.client.auth.set({
      providerID,
      auth: { type: "api", key: apiKey },
    })
    if (authRes.error) {
      toast.show({ variant: "error", message: JSON.stringify(authRes.error) })
      return
    }
  }

  await sdk.client.instance.dispose()
  await sync.bootstrap()
  dialog.replace(() => <DialogModel providerID={providerID} />)
}

async function runSearchAuthWizard(opts: {
  dialog: DialogContext
  sdk: ReturnType<typeof useSDK>
  sync: ReturnType<typeof useSync>
  toast: ToastContext
  providerID: string
  title: string
}) {
  const keyRaw = await DialogPrompt.show(opts.dialog, opts.title, { placeholder: "API key" })
  if (keyRaw === null) return
  const key = keyRaw.trim()
  if (!key) return
  const result = await opts.sdk.client.auth.set({
    providerID: opts.providerID,
    auth: { type: "api", key },
  })
  if (result.error) {
    opts.toast.show({ variant: "error", message: JSON.stringify(result.error) })
    return
  }
  await opts.sdk.client.instance.dispose()
  await opts.sync.bootstrap()
  opts.toast.show({ variant: "info", message: `${opts.title.replace(" API key", "")} connected` })
  opts.dialog.clear()
}

async function runGoogleSearchAuthWizard(opts: {
  dialog: DialogContext
  sdk: ReturnType<typeof useSDK>
  sync: ReturnType<typeof useSync>
  toast: ToastContext
}) {
  const keyRaw = await DialogPrompt.show(opts.dialog, "Google API key (1/2)", { placeholder: "AIza..." })
  if (keyRaw === null) return
  const key = keyRaw.trim()
  if (!key) return
  const cseRaw = await DialogPrompt.show(opts.dialog, "Google CSE ID (2/2)", { placeholder: "Programmable Search cx" })
  if (cseRaw === null) return
  const cse = cseRaw.trim()
  if (!cse) return
  const result = await opts.sdk.client.auth.set({
    providerID: "google",
    auth: { type: "api", key, metadata: { cseID: cse } },
  })
  if (result.error) {
    opts.toast.show({ variant: "error", message: JSON.stringify(result.error) })
    return
  }
  await opts.sdk.client.instance.dispose()
  await opts.sync.bootstrap()
  opts.toast.show({ variant: "info", message: "Google Custom Search connected" })
  opts.dialog.clear()
}

interface AutoMethodProps {
  index: number
  providerID: string
  title: string
  authorization: ProviderAuthAuthorization
}
function AutoMethod(props: AutoMethodProps) {
  const { theme } = useTheme()
  const sdk = useSDK()
  const dialog = useDialog()
  const sync = useSync()
  const toast = useToast()

  useKeyboard((evt) => {
    if (evt.name === "c" && !evt.ctrl && !evt.meta) {
      const code = props.authorization.instructions.match(/[A-Z0-9]{4}-[A-Z0-9]{4,5}/)?.[0] ?? props.authorization.url
      Clipboard.copy(code)
        .then(() => toast.show({ message: "Copied to clipboard", variant: "info" }))
        .catch(toast.error)
    }
  })

  onMount(async () => {
    const result = await sdk.client.provider.oauth.callback({
      providerID: props.providerID,
      method: props.index,
    })
    if (result.error) {
      dialog.clear()
      return
    }
    await sdk.client.instance.dispose()
    await sync.bootstrap()
    dialog.replace(() => <DialogModel providerID={props.providerID} />)
  })

  return (
    <box paddingLeft={2} paddingRight={2} gap={1} paddingBottom={1}>
      <box flexDirection="row" justifyContent="space-between">
        <text attributes={TextAttributes.BOLD} fg={theme.text}>
          {props.title}
        </text>
        <text fg={theme.textMuted} onMouseUp={() => dialog.clear()}>
          esc
        </text>
      </box>
      <box gap={1}>
        <Link href={props.authorization.url} fg={theme.primary} />
        <text fg={theme.textMuted}>{props.authorization.instructions}</text>
      </box>
      <text fg={theme.textMuted}>Waiting for authorization...</text>
      <text fg={theme.text}>
        c <span style={{ fg: theme.textMuted }}>copy</span>
      </text>
    </box>
  )
}

interface CodeMethodProps {
  index: number
  title: string
  providerID: string
  authorization: ProviderAuthAuthorization
}
function CodeMethod(props: CodeMethodProps) {
  const { theme } = useTheme()
  const sdk = useSDK()
  const sync = useSync()
  const dialog = useDialog()
  const [error, setError] = createSignal(false)

  return (
    <DialogPrompt
      title={props.title}
      placeholder="Authorization code"
      onConfirm={async (value) => {
        const { error } = await sdk.client.provider.oauth.callback({
          providerID: props.providerID,
          method: props.index,
          code: value,
        })
        if (!error) {
          await sdk.client.instance.dispose()
          await sync.bootstrap()
          dialog.replace(() => <DialogModel providerID={props.providerID} />)
          return
        }
        setError(true)
      }}
      description={() => (
        <box gap={1}>
          <text fg={theme.textMuted}>{props.authorization.instructions}</text>
          <Link href={props.authorization.url} fg={theme.primary} />
          <Show when={error()}>
            <text fg={theme.error}>Invalid code</text>
          </Show>
        </box>
      )}
    />
  )
}

interface ApiMethodProps {
  providerID: string
  title: string
  metadata?: Record<string, string>
}
function ApiMethod(props: ApiMethodProps) {
  const dialog = useDialog()
  const sdk = useSDK()
  const sync = useSync()

  return (
    <DialogPrompt
      title={props.title}
      placeholder="API key"
      onConfirm={async (value) => {
        if (!value) return
        await sdk.client.auth.set({
          providerID: props.providerID,
          auth: {
            type: "api",
            key: value,
            ...(props.metadata ? { metadata: props.metadata } : {}),
          },
        })
        await sdk.client.instance.dispose()
        await sync.bootstrap()
        dialog.replace(() => <DialogModel providerID={props.providerID} />)
      }}
    />
  )
}

interface PromptsMethodProps {
  dialog: ReturnType<typeof useDialog>
  prompts: NonNullable<ProviderAuthMethod["prompts"]>[number][]
}
async function PromptsMethod(props: PromptsMethodProps) {
  const inputs: Record<string, string> = {}
  for (const prompt of props.prompts) {
    if (prompt.when) {
      const value = inputs[prompt.when.key]
      if (value === undefined) continue
      const matches = prompt.when.op === "eq" ? value === prompt.when.value : value !== prompt.when.value
      if (!matches) continue
    }

    if (prompt.type === "select") {
      const value = await new Promise<string | null>((resolve) => {
        props.dialog.replace(
          () => (
            <DialogSelect
              title={prompt.message}
              options={prompt.options.map((x) => ({
                title: x.label,
                value: x.value,
                description: x.hint,
              }))}
              onSelect={(option) => resolve(option.value)}
            />
          ),
          () => resolve(null),
        )
      })
      if (value === null) return null
      inputs[prompt.key] = value
      continue
    }

    const value = await new Promise<string | null>((resolve) => {
      props.dialog.replace(
        () => (
          <DialogPrompt title={prompt.message} placeholder={prompt.placeholder} onConfirm={(value) => resolve(value)} />
        ),
        () => resolve(null),
      )
    })
    if (value === null) return null
    inputs[prompt.key] = value
  }
  return inputs
}
