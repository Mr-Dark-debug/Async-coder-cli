export function parseFeatureCommand(input: string) {
  const mcp = input.trim().match(/^\/mcp\s+(connect|disconnect)\s+(.+)$/)
  if (mcp) return { type: "mcp" as const, action: mcp[1] as "connect" | "disconnect", name: mcp[2].trim() }
  const skill = input.trim().match(/^\/skill\s+(\S+)(?:\s+([\s\S]*))?$/)
  if (skill) return { type: "skill" as const, name: skill[1], arguments: skill[2] ?? "" }
  if (/^\/mcp\s/.test(input.trim())) return { type: "error" as const, message: "Usage: /mcp connect <name> or /mcp disconnect <name>" }
}
