import { motion } from "framer-motion";
import { Clock, Compass, GitBranch, ListChecks, Users, Wallet } from "lucide-react";
import { SectionHead } from "./section-head";

const ITEMS = [
  {
    icon: GitBranch,
    title: "Background jobs",
    body: "Detached sessions that run in their own git worktree, stop at a spend cap, and finish only when your gate passes.",
    code: 'jobs run --verify "bun test"',
  },
  {
    icon: Users,
    title: "Teams of workers",
    body: "Parallel workers on separate branches, merged in order. The merge stops at the first conflict and tells you why.",
    code: "jobs team plan.md",
  },
  {
    icon: ListChecks,
    title: "Spec workflow",
    body: "Requirements, design, then tasks — enforced by the tool, not by hope. Run ready tasks one at a time or in waves.",
    code: "/skill spec",
  },
  {
    icon: Compass,
    title: "Steering files",
    body: "Project guidance that attaches only when it applies: always, for matching files, or on request.",
    code: ".async-coder/steering/",
  },
  {
    icon: Clock,
    title: "Routines",
    body: "Cron-triggered jobs from the server on your own machine. Quiet hours keep the notifications polite.",
    code: 'routines: ["0 9 * * 1-5"]',
  },
  {
    icon: Wallet,
    title: "Budgets you can trust",
    body: "Session, agent, daily and monthly caps that warn, downgrade the model, then stop. Per-model cost, always visible.",
    code: "/usage",
  },
] as const;

export function Capabilities() {
  return (
    <section className="py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-5 md:px-8">
        <SectionHead eyebrow="What it does" title="Hand off the work." accent="Keep the control.">
          Everything below runs locally, with your keys, and leaves a receipt you can read.
        </SectionHead>

        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ITEMS.map((item, i) => (
            <motion.article
              key={item.title}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.55, delay: (i % 3) * 0.07 }}
              className="paper-card p-6 flex flex-col group hover:-translate-y-0.5 transition-transform duration-300"
            >
              <span className="grid place-items-center w-10 h-10 rounded-xl bg-accent text-lavender-deep">
                <item.icon className="w-5 h-5" strokeWidth={1.75} />
              </span>
              <h3 className="mt-5 text-[17px] font-medium tracking-tight">{item.title}</h3>
              <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground flex-1">
                {item.body}
              </p>
              <code className="mt-5 self-start rounded-full bg-muted px-3 py-1 font-mono text-[11.5px] text-muted-foreground">
                {item.code}
              </code>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
