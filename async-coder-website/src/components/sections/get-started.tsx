import { motion } from "framer-motion";
import { Check, Copy, Sparkles, Terminal } from "lucide-react";
import { useState } from "react";
import { SectionHead } from "./section-head";
import { SITE } from "@/lib/site";

const STEPS = [
  {
    n: "01",
    title: "Install the CLI",
    body: "One global package from npm/bun, or grab the single release binary directly from GitHub.",
    cmd: SITE.install,
  },
  {
    n: "02",
    title: "Connect any model",
    body: "Bring your API key from any provider or point to local Ollama. Keys stay encrypted on your disk.",
    cmd: "async-coder providers login",
  },
  {
    n: "03",
    title: "Launch background jobs",
    body: "Hand off a task and set a test gate. Close your laptop; the agent works in an isolated worktree.",
    cmd: 'async-coder jobs run "fix checkout retry loop" --verify "bun test"',
  },
] as const;

function CopyLine({ cmd }: { cmd: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        void navigator.clipboard.writeText(cmd);
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
      }}
      className="mt-6 w-full flex items-center gap-2.5 rounded-xl bg-foreground text-background px-3.5 py-2.5 font-mono text-[11.5px] text-left hover:opacity-95 active:scale-[0.99] transition-all shadow-xs"
      aria-label={`Copy: ${cmd}`}
    >
      <span className="opacity-50 text-lavender">$</span>
      <span className="flex-1 break-all truncate">{cmd}</span>
      <span className="grid place-items-center w-6 h-6 rounded-lg bg-background/15 shrink-0">
        {copied ? (
          <Check className="w-3.5 h-3.5 text-emerald-400" />
        ) : (
          <Copy className="w-3.5 h-3.5 opacity-80" />
        )}
      </span>
    </button>
  );
}

export function GetStarted() {
  return (
    <section className="pb-24 md:pb-32 relative">
      <div className="mx-auto max-w-6xl px-5 md:px-8">
        <SectionHead
          eyebrow="Quick Setup"
          title="Three commands."
          accent="Zero accounts."
          note="✦ starts working locally in under two minutes"
        >
          No logins, no telemetry, no subscription paywalls. You get full autonomous agency directly
          on your terminal.
        </SectionHead>

        <ol className="mt-14 grid gap-5 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <motion.li
              key={s.n}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="paper-card p-6 flex flex-col group hover:-translate-y-1 transition-all duration-300"
            >
              <div className="flex items-center justify-between">
                <span className="font-serif-display text-4xl text-lavender-deep leading-none font-normal">
                  {s.n}
                </span>
                <span className="w-2 h-2 rounded-full bg-lavender-deep/40 group-hover:bg-lavender-deep transition-colors" />
              </div>

              <h3 className="mt-5 text-[17.5px] font-semibold tracking-tight text-foreground">
                {s.title}
              </h3>
              <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground flex-1 font-normal">
                {s.body}
              </p>
              <CopyLine cmd={s.cmd} />
            </motion.li>
          ))}
        </ol>
      </div>
    </section>
  );
}
