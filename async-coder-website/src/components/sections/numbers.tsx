import { motion } from "framer-motion";
import { CheckCircle2, Shield, Sparkles, Terminal } from "lucide-react";
import { SITE } from "@/lib/site";

const STATS = [
  {
    value: "3,500+",
    label: "automated tests in core suite",
    note: "0 failing at the 0.2.0 release",
  },
  {
    value: "20",
    label: "lifecycle hook events",
    note: "block, rewrite, or annotate any tool call",
  },
  {
    value: "7+",
    label: "model provider families",
    note: "plus any OpenAI-compatible API or local Ollama",
  },
  {
    value: "0",
    label: "telemetry or tracking",
    note: "100% open source under the MIT license",
  },
] as const;

export function Numbers() {
  return (
    <section className="pb-24 md:pb-32 relative">
      <div className="mx-auto max-w-6xl px-5 md:px-8">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.1fr] items-center">
          <dl className="grid grid-cols-2 gap-x-8 gap-y-10">
            {STATS.map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className="flex flex-col group"
              >
                <dd className="order-1 font-serif-display text-[clamp(2.8rem,5.2vw,4.2rem)] leading-none tracking-tight text-foreground group-hover:text-lavender-deep transition-colors">
                  {s.value}
                </dd>
                <dt className="order-2 mt-3.5 text-[14px] font-semibold text-foreground tracking-tight">
                  {s.label}
                </dt>
                <dd className="order-3 mt-1.5 text-[12.5px] text-muted-foreground font-normal leading-snug">
                  {s.note}
                </dd>
              </motion.div>
            ))}
          </dl>

          <motion.blockquote
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="paper-card p-8 md:p-11 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-36 h-36 bg-lavender/10 rounded-full blur-3xl pointer-events-none" />

            <p className="font-serif-display text-[clamp(1.65rem,2.8vw,2.3rem)] leading-[1.28] tracking-tight text-foreground">
              “Built for people who read the diff. Every automatic decision leaves a receipt, every
              cost is a number you can verify, and nothing leaves your machine unless you explicitly
              send it.”
            </p>

            <footer className="mt-8 pt-6 border-t border-border/60 flex items-center justify-between text-sm">
              <div className="flex items-center gap-3">
                <img
                  src="/mark.svg"
                  alt="async-coder seal"
                  className="w-8 h-8 rounded-[10px] shadow-xs"
                />
                <div>
                  <p className="font-semibold text-foreground leading-none">
                    The {SITE.name} Manifesto
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Autonomous, local, verified</p>
                </div>
              </div>
              <span className="font-handwriting text-xl text-lavender-deep hidden sm:inline">
                verified engineering
              </span>
            </footer>
          </motion.blockquote>
        </div>
      </div>
    </section>
  );
}
