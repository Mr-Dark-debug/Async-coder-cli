import { CodeBlock } from "@/components/code-block";
import { motion } from "framer-motion";

const STEPS = [
  {
    n: "1",
    title: "Install",
    body: "Grab the binary via npm, bun, or the curl installer.",
    code: "npm install -g async-coder",
  },
  {
    n: "2",
    title: "Add your key",
    body: "Pick Groq (free + fast). Paste your API key — that's it.",
    code: "async-coder\n# → Pick Groq → paste key from console.groq.com/keys",
  },
  {
    n: "3",
    title: "Start coding",
    body: "Ask anything. Watch the sidebar usage widget update live.",
    code: "async-coder\n# → ask: refactor src/api.ts to use Zod",
  },
];

export function QuickInstall() {
  return (
    <section className="py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <div className="text-center max-w-2xl mx-auto">
          <div className="text-xs font-mono uppercase tracking-widest text-lavender mb-3">
            Quickstart
          </div>
          <h2 className="font-display text-3xl md:text-5xl font-semibold tracking-tight">
            Get started in 60 seconds.
          </h2>
        </div>

        <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-6">
          {STEPS.map((s, i) => (
            <motion.div
              key={s.n}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className="rounded-xl border border-border/60 bg-panel/60 p-6 hover:border-lavender/40 transition-colors"
            >
              <div className="font-display text-6xl font-semibold text-gradient-lavender leading-none">
                {s.n}
              </div>
              <h3 className="mt-4 font-display font-semibold text-lg">{s.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{s.body}</p>
              <div className="mt-5">
                <CodeBlock code={s.code} />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
