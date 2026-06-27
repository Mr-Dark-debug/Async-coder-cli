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
