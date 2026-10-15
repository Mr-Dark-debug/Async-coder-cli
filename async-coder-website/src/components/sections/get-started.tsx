import { motion } from "framer-motion";
import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { SectionHead } from "./section-head";
import { SITE } from "@/lib/site";

const STEPS = [
  {
    n: "01",
    title: "Install",
    body: "One global package from npm, or a release binary from GitHub.",
    cmd: SITE.install,
  },
  {
    n: "02",
    title: "Connect a model",
    body: "Bring a key from any provider. Keys stay on your machine.",
    cmd: "async-coder providers login",
  },
  {
    n: "03",
    title: "Start a job",
    body: "Give it a task and a gate. Close the terminal; the server keeps working.",
    cmd: 'async-coder jobs run "fix the flaky checkout test" --verify "bun test"',
  },
] as const;

function CopyLine({ cmd }: { cmd: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        void navigator.clipboard.writeText(cmd);
        setCopied(true);
        setTimeout(() => setCopied(false), 1400);
      }}
      className="mt-5 w-full flex items-center gap-3 rounded-xl bg-foreground text-background px-4 py-3 font-mono text-[12px] text-left hover:opacity-95 transition-opacity"
      aria-label={`Copy: ${cmd}`}
    >
      <span className="opacity-50">$</span>
      <span className="flex-1 break-all">{cmd}</span>
      {copied ? (
        <Check className="w-4 h-4 shrink-0" />
      ) : (
        <Copy className="w-4 h-4 shrink-0 opacity-70" />
      )}
    </button>
  );
}

export function GetStarted() {
  return (
    <section className="pb-24 md:pb-32">
      <div className="mx-auto max-w-6xl px-5 md:px-8">
        <SectionHead eyebrow="Get started" title="Three commands." accent="No account." />
        <ol className="mt-12 grid gap-4 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <motion.li
              key={s.n}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="paper-card p-6 flex flex-col"
            >
              <span className="font-serif text-4xl text-lavender-deep leading-none">{s.n}</span>
              <h3 className="mt-5 text-[17px] font-medium tracking-tight">{s.title}</h3>
              <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground flex-1">
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
