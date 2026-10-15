import { motion } from "framer-motion";
import { ArrowRight, Check, Circle, Copy, Github, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { SITE } from "@/lib/site";

const PROMPT = "Fix the flaky checkout tests and open a draft PR";

const STEPS = [
  { state: "done", label: "Created worktree", meta: "fix/checkout-tests" },
  { state: "done", label: "Reproduced 3 failures", meta: "checkout.test.ts" },
  { state: "run", label: "Patching retry logic", meta: "your model" },
  { state: "wait", label: "Verification gate", meta: "bun test" },
] as const;

function usePrompt(text: string) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (n >= text.length) return;
    const t = setTimeout(() => setN((v) => v + 1), 38);
    return () => clearTimeout(t);
  }, [n, text]);
  return { shown: text.slice(0, n), done: n >= text.length };
}

function PromptCard() {
  const { shown, done } = usePrompt(PROMPT);
  return (
    <div
      className="glass-card rounded-2xl w-full max-w-md p-3.5 text-left animate-float-up"
      style={{ animationDelay: "600ms" }}
    >
      <div className="flex items-start gap-3 rounded-xl bg-white/55 dark:bg-white/10 border border-white/60 dark:border-white/10 px-3.5 py-3">
        <p className="flex-1 text-[13.5px] leading-snug text-foreground min-h-[2.6em]">
          {shown}
          <span
            className={`inline-block w-[2px] h-[1em] align-middle ml-0.5 bg-foreground ${done ? "animate-blink" : ""}`}
          />
        </p>
        <span className="mt-0.5 grid place-items-center w-7 h-7 rounded-full bg-foreground text-background shrink-0">
          <ArrowRight className="w-3.5 h-3.5 -rotate-90" />
        </span>
      </div>

      <ul className="mt-3 space-y-1.5 px-1">
        {STEPS.map((s, i) => (
          <motion.li
            key={s.label}
            initial={{ opacity: 0, x: -8 }}
            animate={done ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.4, delay: 0.15 * i }}
            className="flex items-center gap-2.5 text-[12.5px]"
          >
            {s.state === "done" && (
              <span className="grid place-items-center w-4 h-4 rounded-full bg-success/90 text-white">
                <Check className="w-2.5 h-2.5" strokeWidth={3} />
              </span>
            )}
            {s.state === "run" && <Loader2 className="w-4 h-4 text-lavender-deep animate-spin" />}
            {s.state === "wait" && <Circle className="w-4 h-4 text-muted-foreground/60" />}
            <span className={s.state === "wait" ? "text-muted-foreground" : "text-foreground"}>
              {s.label}
            </span>
            <span className="ml-auto font-mono text-[10.5px] text-muted-foreground truncate max-w-[40%]">
              {s.meta}
            </span>
          </motion.li>
        ))}
      </ul>

      <div className="mt-3 flex items-center justify-between rounded-xl bg-foreground/[0.06] px-3 py-2 text-[11.5px]">
        <span className="text-muted-foreground">Spend cap</span>
        <span className="font-mono text-foreground">$0.42 / $2.00</span>
      </div>
    </div>
  );
}

export function Hero() {
  const [copied, setCopied] = useState(false);
  return (
    <section className="relative pt-10 md:pt-16 pb-6">
      <div className="mx-auto max-w-6xl px-5 md:px-8">
        <div className="inline-flex animate-float-up">
          <Link
            to="/changelog"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-panel px-3 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-lavender-deep" />
            {SITE.version} — spec workflow, steering files and a new look
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <h1
          className="font-serif-display mt-6 text-[clamp(2.8rem,7.4vw,6rem)] max-w-4xl animate-float-up"
          style={{ animationDelay: "60ms" }}
        >
          Code that keeps shipping <em className="italic text-lavender-deep">while you're away.</em>
        </h1>

        <p
          className="mt-6 max-w-xl text-[17px] leading-relaxed text-muted-foreground animate-float-up"
          style={{ animationDelay: "140ms" }}
        >
          async-coder is a terminal-native coding agent. Bring any model, run work in isolated git
          worktrees, cap the spend, and come back to diffs that already passed your checks.
        </p>

        <div
          className="mt-8 flex flex-col sm:flex-row sm:items-center gap-3 animate-float-up"
          style={{ animationDelay: "220ms" }}
        >
          <button
            onClick={() => {
              void navigator.clipboard.writeText(SITE.install);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
            className="group inline-flex items-center gap-3 h-12 pl-5 pr-3 rounded-full bg-foreground text-background font-mono text-[13px] hover:opacity-95 transition-opacity"
            aria-label="Copy install command"
          >
            <span className="opacity-50">$</span>
            <span>{SITE.install}</span>
            <span className="grid place-items-center w-7 h-7 rounded-full bg-background/15">
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            </span>
          </button>
          <Link
            to="/docs/quickstart"
            className="inline-flex items-center gap-1.5 h-12 px-5 rounded-full border border-border bg-panel text-sm font-medium hover:border-foreground/30 transition-colors"
          >
            Read the quickstart <ArrowRight className="w-4 h-4" />
          </Link>
          <a
            href={SITE.repoUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 h-12 px-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <Github className="w-4 h-4" /> GitHub
          </a>
        </div>
      </div>

      <div
        className="mx-auto max-w-6xl px-3 md:px-8 mt-12 md:mt-16 animate-float-up"
        style={{ animationDelay: "300ms" }}
      >
        <figure className="relative overflow-hidden rounded-[22px] md:rounded-[32px] border border-border shadow-[0_30px_80px_-40px_rgba(60,40,140,0.45)]">
          <img
            src="/art/hero-dawn.jpg"
            alt="A painted coastal hillside at dawn with a cottage, cypress trees and a distant lighthouse"
            className="w-full h-[460px] md:h-[620px] object-cover object-[50%_60%]"
            width={1536}
            height={1024}
            fetchPriority="high"
          />
          <div
            className="absolute inset-0 bg-gradient-to-b from-white/10 via-transparent to-black/10"
            aria-hidden
          />
          <div className="absolute inset-0 grid place-items-center md:place-items-start md:justify-start p-4 md:p-14 md:pt-16">
            <PromptCard />
          </div>
        </figure>
      </div>
    </section>
  );
}
