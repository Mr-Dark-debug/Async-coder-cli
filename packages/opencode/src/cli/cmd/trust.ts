import { cmd } from "./cmd"
import * as Trust from "@/project/trust"

export const TrustCommand = cmd({
  command: "trust [action]",
  describe: "trust or untrust this project's own skills (.claude/.codex/.opencode)",
  builder: (yargs) =>
    yargs.positional("action", { type: "string", choices: ["status", "grant", "revoke", "list"], default: "status" }),
  handler: async (args) => {
    const dir = process.cwd()
    if (args.action === "grant") {
      Trust.grant(dir)
      return void process.stdout.write(`Trusted: ${dir}\nThis project's skills will load. Revoke with \`async-coder trust revoke\`.\n`)
    }
    if (args.action === "revoke") return void process.stdout.write(Trust.revoke(dir) ? `Revoked trust for ${dir}\n` : "This project was not trusted.\n")
    if (args.action === "list") return void process.stdout.write(Trust.list().join("\n") + "\n")
    process.stdout.write(Trust.isTrusted(dir) ? `Trusted: ${dir}\n` : `Not trusted: ${dir}\nProject skills are not loaded. Run \`async-coder trust grant\` after reviewing them.\n`)
  },
})
