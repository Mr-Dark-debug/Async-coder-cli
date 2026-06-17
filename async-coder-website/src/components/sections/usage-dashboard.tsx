import { motion } from "framer-motion";
import { CodeBlock } from "@/components/code-block";

const ROWS = [
  { model: "groq/llama-3.3-70b", cost: "$0.012", in: "1.2k", out: "340", cr: "8.1k" },
  { model: "anthropic/claude-4.5-sonnet", cost: "$0.041", in: "3.1k", out: "820", cr: "2.4k" },
  { model: "openai/gpt-5", cost: "$0.028", in: "1.9k", out: "510", cr: "1.1k" },
  { model: "google/gemini-2.5-pro", cost: "$0.004", in: "5.2k", out: "1.1k", cr: "—" },
  { model: "xai/grok-4", cost: "$0.002", in: "1.0k", out: "430", cr: "—" },
];

const SPARK = [12, 18, 28, 34, 46, 42, 32, 24, 18, 22, 36, 48, 60, 52, 38];

export function UsageDashboard() {
  return (
    <section className="py-24 md:py-32 relative">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <div className="max-w-2xl">
          <div className="text-xs font-mono uppercase tracking-widest text-lavender mb-3">
            Usage dashboard
          </div>
          <h2 className="font-display text-3xl md:text-5xl font-semibold tracking-tight">
            Know what you're spending.
          </h2>
          <p className="mt-4 text-muted-foreground text-base md:text-lg">
            Per-model, per-provider, per-session. Live in the sidebar. Exportable to CSV.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5 }}
            className="rounded-xl border border-lavender/25 bg-elevated/70 overflow-hidden font-mono text-[12px]"
          >
            <div className="flex items-center justify-between px-5 py-3 border-b border-border/60">
              <span className="text-xs uppercase tracking-widest text-muted-foreground">
                Session usage
              </span>
              <span className="text-lavender font-semibold">$0.087 spent</span>
            </div>
            <div className="px-5 py-4 grid grid-cols-2 sm:grid-cols-5 gap-3 text-[11px] border-b border-border/60">
              {[
                ["in", "12.4k"],
                ["out", "3.2k"],
                ["cache-r", "8.1k"],
                ["cache-w", "0"],
                ["reason", "1.4k"],
              ].map(([k, v]) => (
                <div key={k}>
                  <div className="uppercase tracking-widest text-muted-foreground">{k}</div>
                  <div className="text-foreground font-semibold mt-1">{v}</div>
                </div>
              ))}
            </div>

            <div className="px-5 py-3 border-b border-border/60">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="text-muted-foreground text-[10px] uppercase tracking-widest">
                    <th className="text-left font-normal py-1.5">Model</th>
                    <th className="text-right font-normal">$ Cost</th>
                    <th className="text-right font-normal">in</th>
                    <th className="text-right font-normal">out</th>
                    <th className="text-right font-normal">cr</th>
                  </tr>
                </thead>
                <tbody>
                  {ROWS.map((r) => (
                    <tr key={r.model} className="border-t border-border/40">
                      <td className="py-2 text-foreground">{r.model}</td>
                      <td className="text-right text-lavender">{r.cost}</td>
                      <td className="text-right text-muted-foreground">{r.in}</td>
                      <td className="text-right text-muted-foreground">{r.out}</td>
                      <td className="text-right text-muted-foreground">{r.cr}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="px-5 py-4">
              <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1.5">
                <span>Context window</span>
                <span>12k / 32k · 42%</span>
              </div>
              <div className="h-2 w-full bg-border/60 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  whileInView={{ width: "42%" }}
                  viewport={{ once: true }}
                  transition={{ duration: 1.2, ease: "easeOut" }}
                  className="h-full bg-gradient-to-r from-lavender-deep via-lavender to-lavender-soft rounded-full"
                />
              </div>
            </div>
          </motion.div>

          <div className="flex flex-col gap-4">
            {[
              { label: "Today", value: "$0.42" },
              { label: "This week", value: "$3.18" },
              { label: "All-time", value: "$24.91" },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-border/60 bg-panel/60 p-4">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  {s.label}
                </div>
                <div className="font-display text-2xl font-semibold text-foreground mt-1">
                  {s.value}
                </div>
                <div className="mt-3 flex items-end gap-0.5 h-10">
                  {SPARK.map((v, i) => (
                    <div
                      key={i}
                      className="flex-1 bg-lavender/70 rounded-sm"
                      style={{ height: `${v}%`, opacity: 0.4 + (v / 100) * 0.6 }}
                    />
                  ))}
                </div>
              </div>
            ))}
            <CodeBlock lang="bash" code={`async-coder /usage --export csv`} />
          </div>
        </div>
      </div>
    </section>
  );
}
