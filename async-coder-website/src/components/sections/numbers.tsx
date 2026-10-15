import { motion } from "framer-motion";
import { SITE } from "@/lib/site";

// Figures come from the repository itself (docs/releases/v0.2.0-validation.md and docs/hooks.md), not from marketing.
const STATS = [
  {
    value: "3,500+",
    label: "automated tests in the core suite",
    note: "0 failing at the 0.2.0 release",
  },
  { value: "20", label: "lifecycle hook events", note: "block, rewrite or annotate any tool call" },
  { value: "7", label: "provider families", note: "plus any OpenAI-compatible endpoint" },
  { value: "0", label: "telemetry", note: "MIT licensed, built in the open" },
] as const;

export function Numbers() {
  return (
    <section className="pb-24 md:pb-32">
      <div className="mx-auto max-w-6xl px-5 md:px-8">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.1fr] items-start">
          <dl className="grid grid-cols-2 gap-x-8 gap-y-10">
            {STATS.map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.06 }}
                className="flex flex-col"
              >
                <dt className="order-2 mt-3 text-[13.5px] text-foreground">{s.label}</dt>
                <dd className="order-1 font-serif text-[clamp(2.6rem,5vw,4rem)] leading-none tracking-tight">
                  {s.value}
                </dd>
                <dd className="order-3 mt-1 text-[12px] text-muted-foreground">{s.note}</dd>
              </motion.div>
            ))}
          </dl>

          <motion.blockquote
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="paper-card p-8 md:p-10"
          >
            <p className="font-serif text-[clamp(1.5rem,2.6vw,2.15rem)] leading-[1.25] tracking-tight">
              Built for people who read the diff. Every automatic decision leaves a receipt, every
              cost is a number you can see, and nothing leaves your machine unless you send it.
            </p>
            <footer className="mt-6 flex items-center gap-3 text-sm text-muted-foreground">
              <img src="/mark.svg" alt="" className="w-8 h-8 rounded-[10px]" />
              <span>The {SITE.name} design rule</span>
            </footer>
          </motion.blockquote>
        </div>
      </div>
    </section>
  );
}
