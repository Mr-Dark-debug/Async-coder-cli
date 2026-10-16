import { motion } from "framer-motion";
import {
  CheckCircle2,
  Clock,
  Compass,
  GitBranch,
  ListChecks,
  ShieldCheck,
  Sparkles,
  Terminal,
  Users,
  Wallet,
} from "lucide-react";
import { SectionHead } from "./section-head";

const ITEMS = [
  {
    icon: GitBranch,
    title: "Background jobs in isolated worktrees",
    body: "Detached sessions that execute in their own git worktrees, respect hard spend caps, and finish only when your verification gate passes.",
    code: 'jobs run --verify "bun test"',
    tag: "Worktrees",
  },
  {
    icon: Users,
    title: "Teams of autonomous workers",
    body: "Spin up parallel workers on separate branches simultaneously. Merges happen in order and stop at the first conflict with clear receipts.",
    code: "jobs team plan.md",
    tag: "Parallel",
  },
  {
    icon: ListChecks,
    title: "Spec-driven workflow",
    body: "Requirements, architecture, and task gates enforced by the engine, not by wishful thinking. Run tasks one at a time or in automated waves.",
    code: "async-coder spec run",
    tag: "Specs",
  },
  {
    icon: Compass,
    title: "Dynamic steering files",
    body: "Project context that attaches only when relevant: always, for matching file patterns, or on demand. Keep prompts lean and focused.",
    code: ".async-coder/steering/*.md",
    tag: "Context",
  },
  {
    icon: Sparkles,
    title: "Best-of-N candidate synthesis",
    body: "Explore multiple implementation paths in parallel. The engine executes your test suite against each candidate and merges the cleanest diff.",
    code: "async-coder run --best-of 3",
    tag: "Synthesis",
  },
  {
    icon: Wallet,
    title: "Hard budgets you can trust",
    body: "Session, agent, daily, and monthly caps that warn you, downgrade to budget models, and safely halt. Per-model token receipts, always visible.",
    code: "/usage --cap 2.00",
    tag: "Governance",
  },
] as const;

export function Capabilities() {
  return (
    <section className="py-24 md:py-32 relative">
      <div className="mx-auto max-w-6xl px-5 md:px-8">
        <SectionHead
          eyebrow="Core Architecture"
          title="Hand off the work."
          accent="Keep total control."
          note="✦ runs locally with your keys · zero telemetry"
        >
          Traditional AI assistants hijack your terminal and produce unverified hallucinations.
          async-coder works like a disciplined senior engineer: planning first, working in isolated
          worktrees, and proving that the code works before touching main.
        </SectionHead>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {ITEMS.map((item, i) => (
            <motion.article
              key={item.title}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: (i % 3) * 0.08 }}
              className="paper-card p-6 flex flex-col group hover:-translate-y-1 hover:shadow-xl transition-all duration-300 relative overflow-hidden"
            >
              <div className="flex items-center justify-between">
                <span className="grid place-items-center w-11 h-11 rounded-2xl bg-lavender-deep/10 text-lavender-deep border border-lavender-deep/20 transition-transform duration-300 group-hover:scale-105">
                  <item.icon className="w-5 h-5" strokeWidth={1.75} />
                </span>
                <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground/80 bg-foreground/[0.04] px-2.5 py-0.5 rounded-full border border-border/50">
                  {item.tag}
                </span>
              </div>

              <h3 className="mt-5 text-[17.5px] font-semibold tracking-tight text-foreground">
                {item.title}
              </h3>
              <p className="mt-2.5 text-[14px] leading-relaxed text-muted-foreground flex-1 font-normal">
                {item.body}
              </p>

              <div className="mt-6 pt-3.5 border-t border-border/60 flex items-center justify-between">
                <code className="rounded-full bg-foreground/[0.05] dark:bg-white/10 px-3 py-1 font-mono text-[11.5px] text-muted-foreground group-hover:text-foreground transition-colors">
                  {item.code}
                </code>
                <span className="text-emerald-500 text-xs flex items-center gap-1 font-mono">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  local
                </span>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
