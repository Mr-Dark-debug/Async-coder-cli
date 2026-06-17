import { Check, Copy, Github } from "lucide-react";
import { useState } from "react";
import { SITE } from "@/lib/site";

export function FinalCTA() {
  const [copied, setCopied] = useState(false);
  return (
    <section className="py-24 md:py-32 relative overflow-hidden">
      <div className="absolute inset-0 -z-10 hero-grid-bg" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-lavender to-transparent" />
      <div className="absolute left-1/2 -translate-x-1/2 -bottom-40 w-[700px] h-[700px] bg-lavender/25 rounded-full blur-[140px] pointer-events-none" />

      <div className="relative mx-auto max-w-4xl px-4 md:px-6 text-center">
        <h2 className="font-display text-4xl md:text-6xl font-semibold tracking-tight">
          Start coding with{" "}
          <span className="text-gradient-lavender">async-coder</span>
          <br /> today.
        </h2>
        <p className="mt-5 text-muted-foreground text-lg">
          Free. MIT. Bring your own key. No telemetry.
        </p>
        <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3">
          <div className="flex items-center gap-3 h-12 pl-5 pr-2 rounded-lg bg-lavender text-primary-foreground glow-lavender font-mono text-sm">
            <span className="text-primary-foreground/50">$</span>
            <span className="font-medium">{SITE.install}</span>
            <button
              onClick={() => {
                navigator.clipboard.writeText(SITE.install);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
              className="ml-2 inline-flex items-center justify-center w-8 h-8 rounded-md bg-primary-foreground/10 hover:bg-primary-foreground/20"
              aria-label="Copy"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
          <a
            href={SITE.repoUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 h-12 px-5 rounded-lg border border-lavender/40 hover:bg-lavender/10 text-sm font-medium transition-colors"
          >
            <Github className="w-4 h-4" /> Star on GitHub
          </a>
        </div>
      </div>
    </section>
  );
}
