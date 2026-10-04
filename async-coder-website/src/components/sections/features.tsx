import {
  BarChart3,
  Brain,
  Globe,
  Key,
  Lock,
  Network,
  Palette,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Wallet,
  Workflow,
  ArrowUpRight,
} from "lucide-react";
import { motion } from "framer-motion";

const FEATURES = [
  {
    icon: Network,
    title: "Background jobs",
    body: "Detached sessions in their own git worktree, under a spend cap, with a /jobs panel, notifications and cron routines. Teams run workers in parallel and merge them one by one.",
  },
  {
    icon: ShieldCheck,
    title: "Verified completion",
    body: "A job is done only when its gate passes. Failures are fed back for retry, every job gets a cost and gate receipt, and a draft pull request opens only when you ask.",
  },
  {
    icon: Wallet,
    title: "Budgets that act",
    body: "Cap spend per session, agent, day or month and choose to warn, downgrade to a cheaper tier, or stop. Per-agent caps and model fallback chains keep runaways in check.",
  },
  {
    icon: BarChart3,
    title: "Usage and context",
    body: "Cost per model and agent for this session, today and this month with a projection, plus a /context inspector showing what fills the window and when it compacts.",
  },
  {
    icon: Brain,
    title: "Memory you control",
    body: "Relevant notes are recalled into each turn within a token budget. Browse, pin or forget them at /memory; nothing is written behind your back.",
  },
  {
    icon: Lock,
    title: "Safer by default",
    body: "No implicit share host, repository skills load only after you trust the project, and OS sandbox modes confine shell commands and file writes on Linux and macOS.",
  },
  {
    icon: Sparkles,
    title: "Sage second opinions",
    body: "Ask a second model with /consult, or let a job consult Sage only when its gate fails or the change is risky. A green, low-risk job costs no extra model call.",
  },
  {
    icon: Key,
    title: "Bring your own key",
    body: "Groq, OpenRouter, OpenAI, Anthropic, Google, xAI, Copilot, Ollama and any OpenAI-compatible endpoint. Aliases like cheap, local and long-context pick from what is connected.",
  },
  {
    icon: Smartphone,
    title: "Remote and chat bridges",
    body: "Pair a phone or another machine with a one-time code, or drive a server from Telegram, Discord or Slack with an allowlist and permission prompts in chat.",
  },
  {
    icon: Globe,
    title: "Web search",
    body: "DuckDuckGo (default, no key), Tavily, Brave, Google CSE, or Exa with one config switch.",
  },
  {
    icon: Workflow,
    title: "Hooks, skills and a signed marketplace",
    body: "Shell hooks on lifecycle events, skills and agents you can share, and a marketplace whose registry signature and file checksums are verified before install.",
  },
  {
    icon: Palette,
    title: "Local-first, no telemetry",
    body: "Your sessions, usage and memory stay in local SQLite. An eval harness lets you compare models on your own tasks and catch regressions.",
  },
];

export function Features() {
  return (
    <section id="features" className="py-24 md:py-32 relative">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <div className="max-w-2xl">
          <div className="text-xs font-mono uppercase tracking-widest text-lavender mb-3">
            Why async-coder
          </div>
          <h2 className="font-display text-3xl md:text-5xl font-semibold tracking-tight text-foreground">
            A fork of OpenCode — extended.
          </h2>
          <p className="mt-4 text-muted-foreground text-base md:text-lg leading-relaxed">
            Hand it a ticket, close the laptop, and come back to work that already passed its
            gates, with a receipt of what it cost — on whichever model you chose.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.4, delay: (i % 3) * 0.05 }}
              className="group relative rounded-xl border border-border/60 bg-panel/60 p-6 hover:border-lavender/40 hover:-translate-y-1 transition-all"
            >
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-lavender/10 border border-lavender/20 text-lavender mb-4 group-hover:bg-lavender/20 transition-colors">
                <f.icon className="w-5 h-5" />
              </div>
              <h3 className="font-display font-semibold text-foreground">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{f.body}</p>
              <div className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-lavender opacity-0 group-hover:opacity-100 transition-opacity">
                Learn more <ArrowUpRight className="w-3 h-3" />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
