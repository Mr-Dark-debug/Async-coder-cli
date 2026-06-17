import { CodeBlock } from "@/components/code-block";
import { motion } from "framer-motion";

const PILLS = [
  { name: "DuckDuckGo", note: "free · no key" },
  { name: "Tavily", note: "1k/mo free" },
  { name: "Brave", note: "2k/mo free" },
  { name: "Google CSE", note: "100/day free" },
  { name: "Exa", note: "experimental" },
];

export function WebSearch() {
  return (
    <section className="py-24 md:py-32 relative">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <div className="max-w-2xl">
          <div className="text-xs font-mono uppercase tracking-widest text-lavender mb-3">
            Web search
          </div>
          <h2 className="font-display text-3xl md:text-5xl font-semibold tracking-tight">
            Search the web. From your terminal.
          </h2>
          <p className="mt-4 text-muted-foreground text-base md:text-lg">
            Five backends. One config switch. Default: DuckDuckGo (no key required).
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 md:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5 }}
          >
            <CodeBlock
              filename="async-coder.json"
              lang="json"
              code={`{
  "websearch": {
    "provider": "tavily",
    "numResults": 8,
    "timeout": 25
  }
}`}
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5 }}
            className="rounded-lg border border-lavender/25 bg-elevated/70 p-5 font-mono text-[12px] leading-relaxed"
          >
            <div className="text-muted-foreground mb-3">
              <span className="text-lavender">/web</span> "bun 1.3 changelog"
            </div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
              Sources
            </div>
            <ul className="space-y-3">
              <li>
                <div className="text-foreground">
                  Bun 1.3 Release Notes <span className="text-muted-foreground">· bun.sh</span>
                </div>
                <a className="text-lavender hover:underline break-all">https://bun.sh/blog/bun-1.3</a>
                <div className="text-muted-foreground text-[11px] mt-0.5">
                  Bundled TypeScript, faster installs, Node.js compat improvements…
                </div>
              </li>
              <li>
                <div className="text-foreground">
                  Bun v1.3.0 <span className="text-muted-foreground">· github.com</span>
                </div>
                <a className="text-lavender hover:underline break-all">
                  github.com/oven-sh/bun/releases/tag/bun-v1.3.0
                </a>
                <div className="text-muted-foreground text-[11px] mt-0.5">
                  Bug fixes, perf, and a new `bun audit` command…
                </div>
              </li>
            </ul>
          </motion.div>
        </div>

        <div className="mt-8 flex flex-wrap gap-2.5">
          {PILLS.map((p) => (
            <span
              key={p.name}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border/60 bg-panel/60 text-xs font-mono hover:border-lavender/40 transition-colors"
            >
              <span className="text-foreground">{p.name}</span>
              <span className="text-muted-foreground">{p.note}</span>
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
