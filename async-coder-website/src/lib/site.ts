export const SITE = {
  name: "async-coder",
  tagline: "The async coding agent for every model.",
  description:
    "Terminal-native AI coding agent. Bring your own key — Groq, OpenRouter, OpenAI, Anthropic, Google, xAI, Copilot. No telemetry, no platform lock-in.",
  repo: "Mr-Dark-debug/Async-coder-cli",
  repoUrl: "https://github.com/Mr-Dark-debug/Async-coder-cli",
  npm: "async-coder",
  version: "v0.1.0",
  install: "npm install -g async-coder",
};

export const NAV = [
  { to: "/features", label: "Features" },
  { to: "/providers", label: "Providers" },
  { to: "/docs", label: "Docs" },
  { to: "/changelog", label: "Changelog" },
  { to: "/community", label: "Community" },
] as const;
