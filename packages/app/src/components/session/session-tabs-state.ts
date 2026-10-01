export function openSessionTab(tabs: readonly string[], id: string) {
  return tabs.includes(id) ? [...tabs] : [...tabs, id]
}

export function closeSessionTab(tabs: readonly string[], id: string, active?: string) {
  const remaining = tabs.filter((tab) => tab !== id)
  return { tabs: remaining, active: active !== id ? active : remaining[Math.max(0, tabs.indexOf(id) - 1)] }
}
