import {
  BarChart3,
  Brain,
  Globe,
  Key,
  Network,
  Palette,
  Shield,
  Sparkles,
  Workflow,
  ArrowUpRight,
} from "lucide-react";
import { motion } from "framer-motion";

const FEATURES = [
  {
    icon: Key,
    title: "Bring your own key",
    body: "Groq first-class. OpenRouter one-key-many-models. OpenAI, Anthropic, Google, xAI, Copilot. Or any custom OpenAI-compatible endpoint.",
  },
  {
    icon: BarChart3,
    title: "Per-model cost dashboard",
    body: "See dollars spent, tokens in/out/cache/reasoning, and context-window usage — per model, per provider, per session. Live in the sidebar.",
  },
  {
    icon: Globe,
    title: "Pluggable web search",
    body: "DuckDuckGo (default, no key), Tavily, Brave, Google CSE, or Exa. One config switch. Falls back gracefully.",
  },
  {
    icon: Brain,
    title: "Persistent memory",
    body: "SQLite FTS5-powered cross-session memory. Project memory, session checkpoints, scratch notes. Auto-injected on resume.",
  },
  {
    icon: Network,
    title: "Subagent orchestration",
    body: "Primary agent spawns subagents on demand. Parallel execution, lifecycle tracking, cancellation, background work, autonomous loops.",
  },
  {
    icon: Workflow,
    title: "Compose workflows",
    body: "Specs-driven development with built-in skills: planning, execution, code review, TDD, debugging, verification, merging.",
  },
  {
    icon: Sparkles,
    title: "Dream & Distill",
    body: "Self-improvement: /dream extracts persistent knowledge from session traces. /distill packages repeated workflows into reusable skills.",
  },
  {
    icon: Palette,
    title: "Lavender identity",
    body: "A calm lavender palette replacing the upstream orange. Same layout, same keybindings, same dialogs — reskinned and extended.",
  },
  {
    icon: Shield,
    title: "Zero telemetry",
    body: "No phone-home. All Xiaomi/MiMo platform calls removed. Local SQLite metrics power /stats and /usage. Your data stays on your machine.",
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
            Multi-provider onboarding, per-model cost dashboards, pluggable web search, and a
            calm lavender identity — all in one terminal-native agent.
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
