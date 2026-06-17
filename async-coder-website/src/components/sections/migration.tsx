import { ArrowRight, RotateCcw } from "lucide-react";
import { Link } from "@tanstack/react-router";

export function Migration() {
  return (
    <section className="py-16 md:py-20">
      <div className="mx-auto max-w-5xl px-4 md:px-6">
        <div className="relative rounded-2xl border border-lavender/40 bg-gradient-to-br from-lavender/10 via-transparent to-accent-blue/10 p-8 md:p-10 overflow-hidden">
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-lavender/20 rounded-full blur-3xl pointer-events-none" />
          <div className="relative">
            <div className="text-xs font-mono uppercase tracking-widest text-lavender mb-3">
              Migration
            </div>
            <h3 className="font-display text-2xl md:text-3xl font-semibold tracking-tight">
              Coming from MiMo-Code?
            </h3>
            <p className="mt-3 text-muted-foreground max-w-2xl leading-relaxed">
              Your sessions, history, and config carry over automatically. On first launch,
              async-coder copies <code className="font-mono text-foreground">mimocode.db</code> →{" "}
              <code className="font-mono text-foreground">async-coder.db</code> and{" "}
              <code className="font-mono text-foreground">~/.config/mimocode/</code> →{" "}
              <code className="font-mono text-foreground">~/.config/async-coder/</code>. One-time,
              idempotent, never deletes the old dirs.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to="/docs/migration"
                className="inline-flex items-center gap-2 h-10 px-4 rounded-md bg-lavender text-primary-foreground text-sm font-medium hover:bg-lavender-soft transition-colors"
              >
                Read the migration guide <ArrowRight className="w-4 h-4" />
              </Link>
              <a className="inline-flex items-center gap-2 h-10 px-4 rounded-md border border-lavender/40 text-foreground text-sm hover:bg-lavender/10 transition-colors">
                <RotateCcw className="w-4 h-4" /> Roll back anytime
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
