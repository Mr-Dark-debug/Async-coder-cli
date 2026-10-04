import path from "path"
import { which } from "@/util/which"

export const SERVERS = [
  { id: "typescript", command: "typescript-language-server", args: ["--stdio"], extensions: [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"], installHint: "npm install -g typescript-language-server typescript" },
  { id: "pyright", command: "pyright-langserver", args: ["--stdio"], extensions: [".py"], installHint: "npm install -g pyright" },
  { id: "pylsp", command: "pylsp", args: [], extensions: [".py"], installHint: "pip install python-lsp-server" },
  { id: "rust", command: "rust-analyzer", args: [], extensions: [".rs"], installHint: "rustup component add rust-analyzer" },
  { id: "gopls", command: "gopls", args: [], extensions: [".go"], installHint: "go install golang.org/x/tools/gopls@latest" },
  { id: "clangd", command: "clangd", args: [], extensions: [".c", ".cpp", ".h", ".hpp", ".cc", ".cxx"], installHint: "Install clangd with your system package manager" },
  { id: "jdtls", command: "jdtls", args: [], extensions: [".java"], installHint: "Install Eclipse JDT Language Server" },
  { id: "solargraph", command: "solargraph", args: ["stdio"], extensions: [".rb"], installHint: "gem install solargraph" },
  { id: "php intelephense", command: "intelephense", args: ["--stdio"], extensions: [".php"], installHint: "npm install -g intelephense" },
  { id: "html", command: "vscode-html-language-server", args: ["--stdio"], extensions: [".html"], installHint: "npm install -g vscode-langservers-extracted" },
  { id: "css", command: "vscode-css-language-server", args: ["--stdio"], extensions: [".css", ".scss", ".less"], installHint: "npm install -g vscode-langservers-extracted" },
  { id: "json", command: "vscode-json-language-server", args: ["--stdio"], extensions: [".json", ".jsonc"], installHint: "npm install -g vscode-langservers-extracted" },
  { id: "bash", command: "bash-language-server", args: ["start"], extensions: [".sh", ".bash"], installHint: "npm install -g bash-language-server" },
  { id: "yaml-ls", command: "yaml-language-server", args: ["--stdio"], extensions: [".yaml", ".yml"], installHint: "npm install -g yaml-language-server" },
] as const

export function discover(directory: string, id?: string) {
  const directories = [directory]
  while (path.dirname(directories.at(-1)!) !== directories.at(-1)) directories.push(path.dirname(directories.at(-1)!))
  const env = {
    ...process.env,
    PATH: [...directories.map((dir) => path.join(dir, "node_modules", ".bin")), process.env.PATH ?? process.env.Path ?? ""].join(path.delimiter),
  }
  return SERVERS.filter((server) => !id || server.id === id).flatMap((server) => {
    const command = which(server.command, env)
    return command ? [{ ...server, command }] : []
  })
}

export function installHint(file: string) {
  return SERVERS.filter((server) => (server.extensions as readonly string[]).includes(path.extname(file)))
    .map((server) => `${server.command}: ${server.installHint}`).join("\n")
}
