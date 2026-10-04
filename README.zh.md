# async-coder

async-coder 是支持多个模型提供商的异步 AI 编程助手，保留淡紫色品牌和终端工作流。

## 安装

```sh
npm install -g @async-coder/cli
async-coder
async-coder run "解释这个项目"
```

0.2.0 的常规安装包是 `@async-coder/cli`，平台二进制包由安装器选择。发布状态请以 npm 和 GitHub Releases 为准。

## 功能与指南

- [MCP](docs/mcp.md)：stdio、Streamable HTTP、SSE，工具权限与连接管理。
- [LSP](docs/lsp.md)：发现已安装的语言服务器，诊断、定义、引用、符号和重命名准备。
- [代理](docs/agents.md)、[技能](docs/skills.md)和[钩子](docs/hooks.md)：审查、测试、文档代理，以及可配置生命周期命令。
- [Git 工作树](docs/worktrees.md)：隔离文件和会话，安全清理和快进合并。
- [检查点](docs/checkpoints.md)：恢复文件与对话，默认保留最近十个，保护无关的手动改动。
- [仓库地图](docs/repo-map.md)：tree-sitter 结构解析、增量缓存、符号和依赖查询，限制提示上下文大小。
- [桌面应用](docs/desktop.md)：多会话标签、文件和差异视图、终端、设置、通知与托盘。
- [会话分享](docs/sharing.md)：离线 HTML/JSON 导出、只读导入，以及已有的托管分享集成。
- [分层指令](docs/instructions.md)：全局、项目、本地与目录级 AGENTS.md。
- [模型](docs/models.md)与 [Zen](docs/zen.md)：经过验证的模型目录、价格、任务推荐和免费模型发现。
- [VS Code](docs/vscode.md)：本地认证侧边栏、编辑器操作、权限提示和原生差异视图。
- [终端界面](docs/tui.md)：命令面板、对话搜索、检查点和直接快捷键。
- [可靠性](docs/reliability.md)：有界队列、退避、显式故障转移、持久化与恢复。

免费价格并不保证免密访问或服务可用性。此仓库没有独立运营 Zen 或分享托管服务。模型名称与限额来自当前提供商目录，不为尚未确认的名称编造元数据。

## 常用快捷键

| 快捷键 | 操作 |
| --- | --- |
| Ctrl+P | 命令面板 |
| Ctrl+N | 新建会话 |
| Ctrl+F | 搜索对话 |
| Ctrl+T | 工作树 |
| Ctrl+Shift+T | 切换模型变体 |

使用 `/checkpoint` 保存检查点，使用 `/rewind` 选择恢复。配置示例见 [docs/examples](docs/examples)。使用自己的提供商密钥或本地 Ollama；Sage 第二意见、网络搜索、使用量统计和原有配置继续受支持。

## 开发

```sh
bun install
cd packages/opencode
bun typecheck
bun test --timeout 30000
```

测试与类型检查须在对应包目录执行。发布流程见 [AGENTS.md](AGENTS.md) 和 [发布指南](docs/npm-publish-async-coder.md)。
