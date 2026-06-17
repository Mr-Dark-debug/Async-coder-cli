# async-coder

`async-coder` 是一个终端原生的多模型编码智能体，基于 Bun、TypeScript、SolidJS TUI、Effect、SQLite 和 Vercel AI SDK 构建。

代码仓库：<https://github.com/Mr-Dark-debug/Async-coder-cli>

## 安装

```bash
npm install -g async-coder
async-coder
```

## 提供商

async-coder 以自带 API Key 的模型提供商为核心。引导界面优先展示 Groq 和 OpenRouter，并继续支持 OpenAI、Anthropic、Google、xAI、GitHub Copilot 以及自定义 OpenAI-compatible 接口。

已有本地配置中的旧免费模型通道会尽量保持兼容，新用户建议配置自己的模型 API Key。

## Web 搜索

`websearch` 工具支持：

- DuckDuckGo：默认，无需 API Key
- Tavily：`TAVILY_API_KEY`
- Brave Search：`BRAVE_API_KEY`
- Google Custom Search：`GOOGLE_API_KEY` 和 `GOOGLE_CSE_ID`
- Exa：`EXA_API_KEY`

在 `async-coder.json` 中配置：

```json
{
  "websearch": {
    "provider": "duckduckgo",
    "numResults": 8,
    "timeout": 25
  }
}
```

## 开发

```bash
bun install
cd packages/opencode
bun typecheck
bun test
```

## 许可证

MIT。
