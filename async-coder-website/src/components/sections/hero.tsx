import { motion } from "framer-motion";
import {
  ArrowRight,
  Check,
  Circle,
  Copy,
  Cpu,
  FileCode2,
  GitBranch,
  Github,
  Layers,
  ListChecks,
  Loader2,
  ShieldCheck,
  Sparkles,
  Terminal,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { SITE } from "@/lib/site";

const PROMPT = "Fix the flaky checkout retry loop, run test suite, and open verified PR";

const STEPS = [
  { state: "done", label: "Worktree isolated", meta: "fix/checkout-retry", icon: GitBranch },
  { state: "done", label: "Reproduced 3 failures", meta: "checkout.test.ts", icon: FileCode2 },
  {
    state: "run",
    label: "Patching exponential backoff",
    meta: "Claude 3.7 Sonnet (BYOK)",
    icon: Cpu,
  },
  {
    state: "wait",
    label: "Verification test gate",
    meta: "bun test (all passing)",
    icon: ShieldCheck,
  },
] as const;

const PIPELINE_MILESTONES = [
  {
    step: "01",
    title: "Plan & Spec",
    desc: "Requirements, design & task gates locked",
    status: "Spec locked",
    state: "done",
    icon: ListChecks,
  },
  {
    step: "02",
    title: "Isolated Worktree",
    desc: "Dedicated git branch, zero dirty state",
    status: "Worktree active",
    state: "done",
    icon: GitBranch,
  },
  {
    step: "03",
    title: "Verification Gate",
    desc: "bun test + tsc + lint enforced",
    status: "3,500+ passing",
    state: "run",
    icon: ShieldCheck,
  },
  {
    step: "04",
    title: "Best-of-N Candidate",
    desc: "Ranks candidates & generates clean diff",
    status: "Ready to ship",
    state: "target",
    icon: Sparkles,
  },
] as const;

function usePrompt(text: string) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (n >= text.length) return;
    const t = setTimeout(() => setN((v) => v + 1), 32);
    return () => clearTimeout(t);
  }, [n, text]);
  return { shown: text.slice(0, n), done: n >= text.length };
}

function PromptCard() {
  const { shown, done } = usePrompt(PROMPT);
  return (
    <div className="glass-card rounded-2xl w-full max-w-[420px] p-4 text-left shadow-2xl ring-1 ring-white/40 dark:ring-white/10">
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-foreground/10 text-xs">
        <div className="flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5 text-lavender-deep" />
          <span className="font-mono text-[11px] font-medium text-foreground">
            async-coder session #142
          </span>
        </div>
        <span className="inline-flex items-center gap-1 text-[10.5px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          running
        </span>
      </div>

      <div className="flex items-start gap-2.5 rounded-xl bg-white/65 dark:bg-white/10 border border-white/70 dark:border-white/10 px-3.5 py-2.5 backdrop-blur-md">
        <p className="flex-1 text-[13px] leading-snug text-foreground min-h-[2.4em] font-mono">
          {shown}
          <span
            className={`inline-block w-[2px] h-[1.1em] align-middle ml-0.5 bg-foreground ${done ? "animate-blink" : ""}`}
          />
        </p>
        <span className="mt-0.5 grid place-items-center w-6 h-6 rounded-full bg-foreground text-background shrink-0">
          <ArrowRight className="w-3 h-3 -rotate-90" />
        </span>
      </div>

      <ul className="mt-3.5 space-y-2 px-0.5">
        {STEPS.map((s, i) => (
          <motion.li
            key={s.label}
            initial={{ opacity: 0, x: -8 }}
            animate={done ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.35, delay: 0.12 * i }}
            className="flex items-center gap-2.5 text-[12.5px]"
          >
            {s.state === "done" && (
              <span className="grid place-items-center w-4 h-4 rounded-full bg-emerald-600 text-white shadow-xs">
                <Check className="w-2.5 h-2.5" strokeWidth={3} />
              </span>
            )}
            {s.state === "run" && <Loader2 className="w-4 h-4 text-lavender-deep animate-spin" />}
            {s.state === "wait" && <Circle className="w-4 h-4 text-muted-foreground/50" />}
            <span
              className={
                s.state === "wait" ? "text-muted-foreground" : "font-medium text-foreground"
              }
            >
              {s.label}
            </span>
            <span className="ml-auto font-mono text-[10.5px] text-muted-foreground truncate max-w-[42%] bg-foreground/[0.04] px-1.5 py-0.5 rounded">
              {s.meta}
            </span>
          </motion.li>
        ))}
      </ul>

      <div className="mt-4 pt-3 border-t border-foreground/10 flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-[11.5px]">
          <span className="text-muted-foreground flex items-center gap-1.5">
            <span>Spend cap</span>
            <span className="text-[10px] font-mono text-muted-foreground/75">(21% used)</span>
          </span>
          <span className="font-mono font-medium text-foreground">$0.42 / $2.00</span>
        </div>
        <div className="w-full h-1.5 rounded-full bg-foreground/10 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-lavender-deep to-emerald-500 rounded-full w-[21%]" />
        </div>
      </div>
    </div>
  );
}

/** Pathly-inspired curved journey milestone trail climbing up the hillside */
function PipelineTrail() {
  return (
    <div className="w-full max-w-sm flex flex-col gap-2.5">
      <div className="text-left mb-1 flex items-center justify-between">
        <span className="text-[11px] font-semibold tracking-wider uppercase text-white/90 drop-shadow-sm flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
          Autonomous Pipeline
        </span>
        <span className="font-handwriting text-amber-200 text-lg drop-shadow-sm">
          runs while you sleep
        </span>
      </div>

      {PIPELINE_MILESTONES.map((item, idx) => (
        <motion.div
          key={item.title}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 + idx * 0.12 }}
          className="glass-card rounded-2xl p-3 flex items-center gap-3 hover:-translate-y-0.5 transition-all duration-200 group cursor-default shadow-lg"
          style={{
            marginLeft: `${idx * 14}px`,
          }}
        >
          <span className="grid place-items-center w-8 h-8 rounded-xl bg-white/70 dark:bg-white/15 text-foreground shrink-0 shadow-xs border border-white/40">
            <item.icon className="w-4 h-4 text-lavender-deep" />
          </span>
          <div className="flex-1 min-w-0 text-left">
            <div className="flex items-center gap-1.5">
              <span className="text-[13px] font-semibold text-foreground tracking-tight">
                {item.title}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground truncate leading-tight mt-0.5">
              {item.desc}
            </p>
          </div>
          <span
            className={`text-[10px] font-mono px-2 py-0.5 rounded-full shrink-0 ${
              item.state === "target"
                ? "bg-amber-400/20 text-amber-700 dark:text-amber-300 border border-amber-400/30"
                : item.state === "run"
                  ? "bg-lavender-deep/15 text-lavender-deep border border-lavender-deep/30"
                  : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
            }`}
          >
            {item.status}
          </span>
        </motion.div>
      ))}
    </div>
  );
}

export function Hero() {
  const [copied, setCopied] = useState(false);
  return (
    <section className="relative pt-12 md:pt-20 pb-8 overflow-hidden">
      <div className="mx-auto max-w-6xl px-5 md:px-8">
        {/* Release Pill & Overline */}
        <div className="inline-flex items-center gap-2 animate-float-up">
          <Link
            to="/changelog"
            className="inline-flex items-center gap-2.5 rounded-full border border-border/80 bg-panel/80 backdrop-blur-md px-3.5 py-1 text-xs text-muted-foreground hover:text-foreground transition-all duration-200 shadow-xs"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-medium text-foreground">{SITE.version}</span>
            <span className="text-muted-foreground/60">·</span>
            <span>Spec runner, steering rules, and best-of-N synthesis</span>
            <ArrowRight className="w-3.5 h-3.5 ml-0.5 text-lavender-deep" />
          </Link>
        </div>

        {/* Grand Headline with refined editorial serif & italic flair */}
        <h1
          className="font-serif-display mt-7 text-[clamp(2.9rem,7vw,5.8rem)] max-w-4xl tracking-tight text-foreground leading-[1.03] animate-float-up"
          style={{ animationDelay: "60ms" }}
        >
          Code that keeps shipping{" "}
          <em className="italic text-lavender-deep font-normal">while you're away.</em>
        </h1>

        {/* Human Subtitle */}
        <p
          className="mt-6 max-w-2xl text-[17px] md:text-[18.5px] leading-relaxed text-muted-foreground font-normal animate-float-up"
          style={{ animationDelay: "140ms" }}
        >
          async-coder is a terminal-native agent for deep engineering work. Bring any model, run
          tasks in isolated git worktrees, lock hard spend caps, and come back to verified diffs
          that already pass your test suite.
        </p>

        {/* Handwritten Organic Annotation - inspired by Singroup & Pathly */}
        <div
          className="mt-3 flex items-center gap-2 text-lavender-deep font-handwriting text-xl md:text-2xl animate-float-up"
          style={{ animationDelay: "180ms" }}
        >
          <span>✨ zero babysitting. 100% verified before merge.</span>
        </div>

        {/* Action Group */}
        <div
          className="mt-8 flex flex-col sm:flex-row sm:items-center gap-3 animate-float-up"
          style={{ animationDelay: "220ms" }}
        >
          {/* Quick Install Pill */}
          <button
            onClick={() => {
              void navigator.clipboard.writeText(SITE.install);
              setCopied(true);
              setTimeout(() => setCopied(false), 1600);
            }}
            className="group inline-flex items-center gap-3 h-12 pl-5 pr-3 rounded-full bg-foreground text-background font-mono text-[13px] hover:opacity-95 active:scale-[0.99] transition-all shadow-md"
            aria-label="Copy install command"
          >
            <span className="opacity-50 text-lavender">$</span>
            <span className="font-medium">{SITE.install}</span>
            <span className="grid place-items-center w-7 h-7 rounded-full bg-background/20 group-hover:bg-background/25 transition-colors">
              {copied ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </span>
          </button>

          {/* Quickstart Link */}
          <Link
            to="/docs/quickstart"
            className="inline-flex items-center justify-center gap-2 h-12 px-6 rounded-full border border-border/80 bg-panel text-sm font-medium hover:border-foreground/40 hover:bg-panel/90 active:scale-[0.99] transition-all shadow-xs"
          >
            Read the quickstart <ArrowRight className="w-4 h-4 text-lavender-deep" />
          </Link>

          {/* GitHub Star */}
          <a
            href={SITE.repoUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-2 h-12 px-4 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <Github className="w-4 h-4" /> GitHub
          </a>
        </div>
      </div>

      {/* The Visual Masterpiece: Dawn Coastal Landscape with Architectural Framing and Dual Interactive Cards */}
      <div
        className="mx-auto max-w-6xl px-3 md:px-8 mt-12 md:mt-16 animate-float-up"
        style={{ animationDelay: "300ms" }}
      >
        <figure className="art-frame relative overflow-hidden rounded-[24px] md:rounded-[34px] border border-border/80 shadow-[0_30px_90px_-35px_rgba(40,40,110,0.45)]">
          {/* Dawn Art Canvas */}
          <img
            src="/art/hero-dawn.jpg"
            alt="A painted coastal hillside at dawn with a cottage, cypress trees and a distant lighthouse"
            className="w-full h-[520px] md:h-[640px] object-cover object-[50%_60%] transition-transform duration-1000 scale-[1.01] hover:scale-[1.02]"
            width={1536}
            height={1024}
            fetchPriority="high"
          />

          {/* Atmospheric Lighting Overlay */}
          <div
            className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/15 pointer-events-none"
            aria-hidden
          />

          {/* Exhibition Top Banner - Inspired by The Renaissance Edition */}
          <div className="absolute top-5 inset-x-6 md:inset-x-10 flex items-center justify-between text-white/80 pointer-events-none text-xs">
            <span className="font-mono text-[11px] tracking-wider uppercase bg-black/30 backdrop-blur-md px-3 py-1 rounded-full border border-white/20">
              The Async Coder Engine · Verifiable Autonomy
            </span>
            <span className="hidden sm:inline font-mono text-[11px] bg-black/30 backdrop-blur-md px-3 py-1 rounded-full border border-white/20">
              MIT Licensed · 0 Telemetry
            </span>
          </div>

          {/* Interactive Dual Cards: Terminal Execution (Left) & Pathly Milestone Trail (Right) */}
          <div className="absolute inset-0 grid grid-cols-1 lg:grid-cols-2 place-items-center lg:items-end justify-between p-4 md:p-10 lg:p-12 gap-6 pointer-events-auto">
            {/* Left: Terminal Job Execution */}
            <div className="w-full flex justify-center lg:justify-start">
              <PromptCard />
            </div>

            {/* Right: Pathly-style curved milestone steps */}
            <div className="w-full hidden md:flex justify-center lg:justify-end">
              <PipelineTrail />
            </div>
          </div>
        </figure>
      </div>
    </section>
  );
}
