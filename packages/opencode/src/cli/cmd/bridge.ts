import { cmd } from "./cmd"
import { Bridge } from "@/bridge/service"
import { Channels } from "@/bridge/store"
import { Telegram } from "@/bridge/telegram"
import { Discord } from "@/bridge/discord"
import { Slack } from "@/bridge/slack"
import { agentFor } from "@/bridge/sdk"

export const BridgeCommand = cmd({
  command: "bridge <protocol>",
  describe: "drive a running server from a chat app (telegram, discord, slack)",
  builder: (yargs) =>
    yargs
      .positional("protocol", { type: "string", choices: ["telegram", "discord", "slack"], demandOption: true })
      .option("attach", { type: "string", default: "http://127.0.0.1:4096", describe: "server URL" })
      .option("password", { type: "string" })
      .option("chat", { type: "array", string: true, default: [], describe: "allowed chat id (repeatable)" })
      .option("user", { type: "array", string: true, default: [], describe: "allowed user id (repeatable)" }),
  handler: async (args) => {
    const need = (name: string) => {
      const value = process.env[name]
      if (!value) throw new Error(`Set ${name}`)
      return value
    }
    const transport =
      args.protocol === "discord"
        ? new Discord(need("ASYNC_CODER_DISCORD_TOKEN"))
        : args.protocol === "slack"
          ? new Slack(need("ASYNC_CODER_SLACK_BOT_TOKEN"), need("ASYNC_CODER_SLACK_APP_TOKEN"))
          : new Telegram(need("ASYNC_CODER_TELEGRAM_TOKEN"))
    const allow = { chats: args.chat as string[], users: args.user as string[] }
    if (allow.chats.length + allow.users.length === 0)
      throw new Error("Refusing to start with an empty allowlist. Pass --chat <id> and/or --user <id>.")
    const bridge = new Bridge(
      transport,
      agentFor({ baseUrl: args.attach, directory: process.cwd(), password: args.password ?? process.env.ASYNC_CODER_SERVER_PASSWORD }),
      await new Channels().load(),
      { allow, protocol: args.protocol, log: (line) => process.stderr.write(`[bridge] ${line}\n`) },
    )
    const controller = new AbortController()
    process.on("SIGINT", () => controller.abort())
    process.stderr.write(`${args.protocol} bridge running. Press Ctrl+C to stop.` + String.fromCharCode(10))
    await bridge.run(controller.signal)
  },
})
