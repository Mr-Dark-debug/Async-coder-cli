import path from "path"
import { sign as edSign, createPrivateKey } from "crypto"
import { cmd } from "./cmd"
import { bootstrap } from "../bootstrap"
import { Config } from "@/config"
import { AppRuntime } from "@/effect/app-runtime"
import { Global } from "@/global"
import { Marketplace } from "@/marketplace"

const need = (value: string | undefined, what: string) => {
  if (!value) throw new Error(what)
  return value
}

export const MarketCommand = cmd({
  command: "market <action> [arg]",
  describe: "browse and install signed skills, agents and commands (ls, search, install, uninstall, update, publish, sign)",
  builder: (yargs) =>
    yargs
      .positional("action", { type: "string", choices: ["ls", "search", "install", "uninstall", "update", "publish", "sign"], demandOption: true })
      .positional("arg", { type: "string", describe: "query, entry name, registry file (sign)" })
      .option("kind", { type: "string", choices: ["skill", "agent", "command"] })
      .option("name", { type: "string" })
      .option("entry-version", { type: "string", default: "0.1.0" })
      .option("description", { type: "string", default: "" })
      .option("dir", { type: "string", describe: "directory holding the files to publish" })
      .option("files", { type: "array", string: true, default: [] })
      .option("base-url", { type: "string", describe: "public URL the files will be served from" })
      .option("key", { type: "string", describe: "private key PEM for `sign`" }),
  handler: async (args) => {
    const configDir = Global.Path.config
    if (args.action === "publish") {
      const entry = await Marketplace.describe({
        name: need(args.name, "--name is required"),
        kind: need(args.kind, "--kind is required") as Marketplace.Kind,
        version: args["entry-version"],
        description: args.description,
        baseUrl: need(args["base-url"], "--base-url is required"),
        dir: path.resolve(need(args.dir, "--dir is required")),
        files: args.files as string[],
      })
      process.stdout.write(JSON.stringify(entry, null, 2) + "\n")
      process.stderr.write("Add this entry to your registry file, then run `async-coder market sign <registry.json> --key <private.pem>` and host the result.\n")
      return
    }
    if (args.action === "sign") {
      const registry = Marketplace.Registry.parse(await Bun.file(need(args.arg, "A registry file is required")).json())
      const key = createPrivateKey(await Bun.file(need(args.key, "--key is required")).text())
      const signature = edSign(null, Buffer.from(Marketplace.canonical(registry)), key).toString("base64")
      process.stdout.write(JSON.stringify({ registry, signature }, null, 2) + "\n")
      return
    }
    await bootstrap(process.cwd(), async () => {
      const cfg = (await AppRuntime.runPromise(Config.Service.use((svc) => svc.get()))).marketplace
      const url = need(cfg?.registry_url, "Set marketplace.registry_url in your config")
      const key = need(cfg?.public_key, "Set marketplace.public_key (the registry's ed25519 public key, 64 hex characters)")
      const registry = await Marketplace.fetchRegistry({ url, key })
      if (args.action === "ls" || args.action === "search") {
        const lock = await Marketplace.readLock(configDir)
        for (const entry of Marketplace.search(registry, args.action === "search" ? (args.arg ?? "") : ""))
          process.stdout.write(`${lock[entry.name] ? "*" : " "} ${entry.name.padEnd(24)} ${entry.kind.padEnd(8)} ${entry.version.padEnd(8)} ${entry.description}\n`)
        return
      }
      if (args.action === "update") {
        const stale = await Marketplace.outdated({ registry, configDir })
        for (const entry of stale) {
          await Marketplace.install({ entry, configDir })
          process.stdout.write(`updated ${entry.name} to ${entry.version}\n`)
        }
        if (stale.length === 0) process.stdout.write("everything is up to date\n")
        return
      }
      const name = need(args.arg, "An entry name is required")
      if (args.action === "uninstall") {
        process.stdout.write((await Marketplace.uninstall({ name, configDir })) ? `removed ${name}\n` : `${name} is not installed\n`)
        return
      }
      const entry = registry.entries.find((item) => item.name === name)
      if (!entry) throw new Error(`No entry named ${name} in the registry`)
      const result = await Marketplace.install({ entry, configDir })
      process.stdout.write(result.installed ? `installed ${name} ${entry.version} -> ${result.path}\n` : `${name} ${entry.version} is already installed\n`)
    })
  },
})
