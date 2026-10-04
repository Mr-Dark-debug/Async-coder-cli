export const SITE = {
  name: "async-coder",
  tagline: "The async coding agent for every model.",
  description:
    "Terminal-native AI coding agent. Bring your own key. Run background jobs in isolated worktrees with spend caps and verification gates. No telemetry, no platform lock-in.",
  repo: "Mr-Dark-debug/Async-coder-cli",
  repoUrl: "https://github.com/Mr-Dark-debug/Async-coder-cli",
  npm: "@async-coder/cli",
  version: "v0.2.0",
  install: "npm install -g @async-coder/cli",
};

export const NAV = [
  { to: "/features", label: "Features" },
  { to: "/providers", label: "Providers" },
  { to: "/docs", label: "Docs" },
  { to: "/changelog", label: "Changelog" },
  { to: "/community", label: "Community" },
] as const;
