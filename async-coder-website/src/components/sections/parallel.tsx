import { motion } from "framer-motion";
import { ArrowRight, Check, Code2, GitBranch, Loader2, ShieldCheck, Terminal } from "lucide-react";
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { SectionHead } from "./section-head";

const JOBS = [
  {
    name: "Upgrade date-fns to v4 & fix SSR",
    branch: "chore/date-fns-v4",
    state: "done",
    cost: "$0.31",
    time: "1m 12s",
  },
  {
    name: "Fix flaky checkout retry tests",
    branch: "fix/checkout-retry",
    state: "run",
    cost: "$0.42",
    time: "48s",
  },
  {
    name: "Generate OpenAPI docs for /billing",
    branch: "docs/billing-spec",
    state: "run",
    cost: "$0.18",
    time: "32s",
  },
  {
    name: "Migrate auth schema to v2 tables",
    branch: "refactor/auth-v2",
    state: "gate",
    cost: "$0.77",
    time: "2m 04s",
  },
] as const;

function State({ state }: { state: (typeof JOBS)[number]["state"] }) {
  if (state === "done")
    return (
      <span className="inline-flex items-center gap-1 font-mono text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
        <Check className="w-3 h-3" strokeWidth={3} /> merged
      </span>
    );
  if (state === "gate")
    return (
      <span className="inline-flex items-center gap-1 font-mono text-[11px] text-lavender-deep font-medium">
        <ShieldCheck className="w-3.5 h-3.5" /> verifying
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 font-mono text-[11px] text-muted-foreground font-medium">
      <Loader2 className="w-3 h-3 animate-spin text-lavender-deep" /> running
    </span>
  );
}

export function Parallel() {
  const [activeTab, setActiveTab] = useState<"worktrees" | "gate">("worktrees");

  return (
    <section className="pb-24 md:pb-32 relative">
      <div className="mx-auto max-w-6xl px-5 md:px-8 grid gap-12 lg:grid-cols-[1.2fr_1fr] items-center">
        {/* Sky Art Canvas with Floating Dual Dashboard */}
        <motion.figure
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.8 }}
          className="art-frame relative overflow-hidden rounded-[24px] md:rounded-[34px] border border-border/80 shadow-[0_30px_90px_-40px_rgba(20,50,120,0.5)]"
        >
          {/* Classical Cloud Art Canvas */}
          <img
            src="/art/sky-clouds.jpg"
            alt="Towering painted classical clouds over a mountain lake framed by pines"
            className="w-full h-[460px] md:h-[540px] object-cover transition-transform duration-1000 scale-[1.01] hover:scale-[1.02]"
            loading="lazy"
            width={1536}
            height={1024}
          />
          <div
            className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent pointer-events-none"
            aria-hidden
          />

          {/* Exhibition Top Pill */}
          <div className="absolute top-4 inset-x-6 flex items-center justify-between text-white/80 pointer-events-none text-xs">
            <span className="font-mono text-[10.5px] uppercase tracking-wider bg-black/40 backdrop-blur-md px-3 py-1 rounded-full border border-white/20">
              Worktree Orchestration · 4 Detached Sessions
            </span>
          </div>

          {/* In-Cloud Floating Glass Dashboard */}
          <div className="absolute inset-0 grid place-items-center p-4 pt-12">
            <div className="glass-card rounded-2xl w-full max-w-md p-4 shadow-2xl ring-1 ring-white/50 dark:ring-white/10">
              {/* Tab Selector */}
              <div className="flex items-center justify-between pb-3 mb-2 border-b border-foreground/10">
                <div className="flex items-center gap-1 bg-foreground/[0.05] p-0.5 rounded-full">
                  <button
                    onClick={() => setActiveTab("worktrees")}
                    className={`px-3 py-1 text-xs rounded-full font-medium transition-all ${
                      activeTab === "worktrees"
                        ? "bg-foreground text-background shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Active Worktrees (4)
                  </button>
                  <button
                    onClick={() => setActiveTab("gate")}
                    className={`px-3 py-1 text-xs rounded-full font-medium transition-all flex items-center gap-1.5 ${
                      activeTab === "gate"
                        ? "bg-foreground text-background shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
                    Verification Gate
                  </button>
                </div>
                <span className="font-mono text-[10.5px] text-muted-foreground">$1.68 / $5.00</span>
              </div>

              {activeTab === "worktrees" ? (
                <ul className="space-y-2">
                  {JOBS.map((j) => (
                    <li
                      key={j.name}
                      className="flex items-center gap-3 rounded-xl bg-white/65 dark:bg-white/10 border border-white/70 dark:border-white/10 px-3.5 py-2.5 backdrop-blur-md hover:bg-white/80 transition-colors"
                    >
                      <div className="grid place-items-center w-7 h-7 rounded-lg bg-lavender-deep/10 text-lavender-deep shrink-0">
                        <GitBranch className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0 flex-1 text-left">
                        <p className="text-[12.5px] font-medium text-foreground truncate">
                          {j.name}
                        </p>
                        <p className="font-mono text-[10px] text-muted-foreground truncate">
                          {j.branch} · {j.time}
                        </p>
                      </div>
                      <div className="text-right text-[11px] shrink-0">
                        <State state={j.state} />
                        <p className="font-mono text-muted-foreground text-[10.5px] mt-0.5">
                          {j.cost}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="rounded-xl bg-black/85 text-emerald-400 p-3.5 font-mono text-[11px] leading-relaxed text-left border border-white/10">
                  <div className="flex items-center justify-between pb-2 border-b border-white/10 text-white/60 text-[10px]">
                    <span>verification-runner · refactor/auth-v2</span>
                    <span className="text-emerald-400">PASSED</span>
                  </div>
                  <div className="mt-2 space-y-1">
                    <p className="text-white/80">$ bun test --bail</p>
                    <p className="text-emerald-400">✓ tests/auth.test.ts (24 pass)</p>
                    <p className="text-emerald-400">✓ tests/session.test.ts (18 pass)</p>
                    <p className="text-white/80">$ tsc --noEmit</p>
                    <p className="text-emerald-400">✓ 0 diagnostic errors found</p>
                    <p className="text-white/50 text-[10px] mt-2 pt-1 border-t border-white/10">
                      Receipt written to .async-coder/receipts/auth-v2.json
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.figure>

        {/* Narrative Section */}
        <div>
          <SectionHead
            eyebrow="Parallel by Default"
            title="Run it in parallel,"
            accent="review it once."
            note="✦ clean branches · zero dirty working trees"
          >
            Traditional agents take over your current branch, create unstaged messes, and break your
            focus. async-coder creates detached git worktrees for every job, executes your test
            gates, and packages verified changes into clean pull requests.
          </SectionHead>

          <ul className="mt-8 space-y-3.5 text-[14.5px] text-muted-foreground font-normal">
            <li className="flex items-start gap-3">
              <span className="mt-1.5 w-2 h-2 rounded-full bg-emerald-500 shrink-0 shadow-xs" />
              <span>
                <strong className="text-foreground font-medium">Isolated Git Worktrees</strong> —
                Work on main while 4 different background jobs refactor modules, write tests, and
                update docs simultaneously.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-1.5 w-2 h-2 rounded-full bg-lavender-deep shrink-0 shadow-xs" />
              <span>
                <strong className="text-foreground font-medium">Deterministic Test Gates</strong> —
                A job only reports completion after your test suite, linter, and typecheck pass
                without human intervention.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-1.5 w-2 h-2 rounded-full bg-amber-500 shrink-0 shadow-xs" />
              <span>
                <strong className="text-foreground font-medium">Hard Spend Safety</strong> — Set
                strict per-job dollar limits. If an agent loops or gets stuck, it halts
                automatically before wasting credits.
              </span>
            </li>
          </ul>

          <div className="mt-9 flex items-center gap-4">
            <Link
              to="/docs/jobs"
              className="inline-flex items-center gap-2 h-11 px-5 rounded-full border border-border/80 bg-panel text-sm font-medium hover:border-foreground/40 hover:bg-panel/90 transition-all shadow-xs"
            >
              How background jobs work <ArrowRight className="w-4 h-4 text-lavender-deep" />
            </Link>
            <Link
              to="/docs/budgets"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Budget & spend caps →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
