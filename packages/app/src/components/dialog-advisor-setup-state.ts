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

export function advisorProviders<T extends { id: string; name: string }>(providers: T[], connected: string[]) {
  const active = new Set(connected)
  return providers.map((provider) => ({
    ...provider,
    status: active.has(provider.id) ? ("connected" as const) : ("setup_required" as const),
  }))
}

export function nextAdvisorStep(providerID: string, result: "connected" | "cancelled") {
  if (result === "connected") return { step: "model" as const, providerID }
  return { step: "provider" as const }
}

export function shouldDiscoverProvider(onConnected: ((providerID: string) => unknown) | undefined) {
  return !!onConnected
}

export function ollamaLocalPreset() {
  return { providerID: "ollama", name: "Ollama (local)", baseURL: "http://localhost:11434/v1" }
}

export function shouldDiscoverCustomProvider(props: { discover?: boolean; onConnected?: unknown }) {
  return !!(props.discover || props.onConnected)
}

export function customProviderIDs(providerIDs: string[], presetID?: string) {
  return new Set(providerIDs.filter((id) => id !== presetID))
}

export function providerCandidateKey(value: string) {
  const key = value.trim()
  if (!key || /^\{env:[^}]+\}$/.test(key)) return
  return key
}

export function providerSetupError(value: unknown, fallback: string): string {
  if (value && typeof value === "object" && "data" in value) {
    const data = (value as { data?: { message?: unknown } }).data
    if (typeof data?.message === "string" && data.message) return data.message
  }
  if (value && typeof value === "object" && "error" in value) {
    const nested = providerSetupError((value as { error?: unknown }).error, "")
    if (nested) return nested
  }
  if (value && typeof value === "object" && "message" in value) {
    const message = (value as { message?: unknown }).message
    if (typeof message === "string" && message) return message
  }
  if (value instanceof Error && value.message) return value.message
  if (typeof value === "string" && value) return value
  return fallback
}
