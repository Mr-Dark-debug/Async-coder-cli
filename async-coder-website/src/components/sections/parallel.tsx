import { motion } from "framer-motion";
import { Check, GitBranch, Loader2, ShieldCheck } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { SectionHead } from "./section-head";

const JOBS = [
  { name: "Upgrade the date library", branch: "chore/date-fns", state: "done", cost: "$0.31" },
  { name: "Fix flaky checkout tests", branch: "fix/checkout", state: "run", cost: "$0.42" },
  { name: "Write API docs for /billing", branch: "docs/billing", state: "run", cost: "$0.18" },
  { name: "Migrate config to v2 schema", branch: "refactor/config", state: "gate", cost: "$0.77" },
] as const;

function State({ state }: { state: (typeof JOBS)[number]["state"] }) {
  if (state === "done")
    return (
      <span className="inline-flex items-center gap-1 text-success">
        <Check className="w-3.5 h-3.5" strokeWidth={3} /> merged
      </span>
    );
  if (state === "gate")
    return (
      <span className="inline-flex items-center gap-1 text-lavender-deep">
        <ShieldCheck className="w-3.5 h-3.5" /> verifying
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 text-muted-foreground">
      <Loader2 className="w-3.5 h-3.5 animate-spin" /> running
    </span>
  );
}

export function Parallel() {
  return (
    <section className="pb-24 md:pb-32">
      <div className="mx-auto max-w-6xl px-5 md:px-8 grid gap-10 lg:grid-cols-[1.25fr_1fr] items-center">
        <motion.figure
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.8 }}
          className="relative overflow-hidden rounded-[22px] md:rounded-[30px] border border-border shadow-[0_30px_80px_-40px_rgba(30,60,140,0.5)]"
        >
          <img
            src="/art/sky-clouds.jpg"
            alt="Towering clouds over a mountain lake framed by pines"
            className="w-full h-[440px] md:h-[520px] object-cover"
            loading="lazy"
            width={1536}
            height={1024}
          />
          <div className="absolute inset-0 grid place-items-center p-4">
            <div className="glass-card rounded-2xl w-full max-w-sm p-4">
              <div className="flex items-center justify-between px-1 pb-2">
                <span className="text-[13px] font-medium">Jobs</span>
                <span className="font-mono text-[10.5px] text-muted-foreground">4 · 1 gate</span>
              </div>
              <ul className="space-y-1.5">
                {JOBS.map((j) => (
                  <li
                    key={j.name}
                    className="flex items-center gap-3 rounded-xl bg-white/55 dark:bg-white/10 border border-white/60 dark:border-white/10 px-3 py-2.5"
                  >
                    <GitBranch className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[12.5px] truncate">{j.name}</p>
                      <p className="font-mono text-[10.5px] text-muted-foreground truncate">
                        {j.branch}
                      </p>
                    </div>
                    <div className="text-right text-[11px] leading-tight">
                      <State state={j.state} />
                      <p className="font-mono text-muted-foreground mt-0.5">{j.cost}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </motion.figure>

        <div>
          <SectionHead
            eyebrow="Parallel by default"
            title="Run it in parallel,"
            accent="review it once."
          >
            Every job gets its own worktree, so four things can move at once without stepping on
            each other. Each one comes back with a receipt: what changed, what it cost, and which
            checks passed.
          </SectionHead>
          <ul className="mt-7 space-y-3 text-[14.5px] text-muted-foreground">
            <li className="flex gap-3">
              <span className="mt-2 w-1.5 h-1.5 rounded-full bg-lavender-deep shrink-0" />
              Deterministic gates first — a green, low-risk job never pays for a second opinion.
            </li>
            <li className="flex gap-3">
              <span className="mt-2 w-1.5 h-1.5 rounded-full bg-lavender-deep shrink-0" />
              Cancel a job and its worktree is removed with it.
            </li>
            <li className="flex gap-3">
              <span className="mt-2 w-1.5 h-1.5 rounded-full bg-lavender-deep shrink-0" />
              Open any result as a draft pull request.
            </li>
          </ul>
          <Link
            to="/docs/jobs"
            className="mt-8 inline-flex items-center h-11 px-5 rounded-full border border-border bg-panel text-sm font-medium hover:border-foreground/30 transition-colors"
          >
            How jobs work
          </Link>
        </div>
      </div>
    </section>
  );
}
