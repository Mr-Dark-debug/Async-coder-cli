import { cmd } from "./cmd"

const DEFAULT_SERVER = "http://127.0.0.1:4096"

export const PairCommand = cmd({
  command: "pair [action] [arg]",
  describe: "pair a phone or another machine with a running server (code, devices, revoke)",
  builder: (yargs) =>
    yargs
      .positional("action", { type: "string", choices: ["code", "devices", "revoke"], default: "code" })
      .positional("arg", { type: "string", describe: "device id for revoke" })
      .option("attach", { type: "string", default: DEFAULT_SERVER })
      .option("password", { type: "string", describe: "server password (defaults to ASYNC_CODER_SERVER_PASSWORD)" }),
  handler: async (args) => {
    const password = args.password ?? process.env.ASYNC_CODER_SERVER_PASSWORD
    const headers: Record<string, string> = { "content-type": "application/json" }
    if (password)
      headers.authorization = `Basic ${Buffer.from(`${process.env.ASYNC_CODER_SERVER_USERNAME ?? "async-coder"}:${password}`).toString("base64")}`
    const call = async (path: string, method = "GET") => {
      const res = await fetch(`${args.attach}${path}`, { method, headers }).catch(() => {
        throw new Error(`Could not reach a server at ${args.attach}. Start one with \`async-coder serve\`.`)
      })
      if (!res.ok) throw new Error(`${res.status} ${await res.text()}`)
      return res.json() as Promise<any>
    }
    if (args.action === "devices") {
      for (const device of await call("/pair/devices"))
        process.stdout.write(`${device.id}  ${device.revoked ? "revoked" : "active "}  ${device.name}\n`)
      return
    }
    if (args.action === "revoke") {
      if (!args.arg) throw new Error("A device id is required")
      process.stdout.write((await call(`/pair/devices/${args.arg}`, "DELETE")) ? "revoked\n" : "no such device\n")
      return
    }
    const { code, expires } = await call("/pair", "POST")
    process.stdout.write(
      `Pairing code: ${code}\nValid for ${Math.round((expires - Date.now()) / 60000)} minutes, single use.\nOn the new device: POST ${args.attach}/pair/exchange  {"code":"${code}","name":"<device name>"}\nthen send the returned token as "Authorization: Bearer <token>".\n`,
    )
  },
})
