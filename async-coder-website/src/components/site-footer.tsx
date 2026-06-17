import { Link } from "@tanstack/react-router";
import { Github } from "lucide-react";
import { SITE } from "@/lib/site";

const COLS = [
  {
    title: "Product",
    links: [
      { label: "Features", to: "/features" },
      { label: "Providers", to: "/providers" },
      { label: "Pricing", to: "/pricing" },
      { label: "Changelog", to: "/changelog" },
    ],
  },
  {
    title: "Docs",
    links: [
      { label: "Quickstart", to: "/docs/quickstart" },
      { label: "Configuration", to: "/docs/configuration" },
      { label: "Providers", to: "/docs/providers" },
      { label: "Web search", to: "/docs/websearch" },
      { label: "Usage", to: "/docs/usage" },
      { label: "Migration", to: "/docs/migration" },
    ],
  },
  {
    title: "Community",
    links: [
      { label: "GitHub", href: SITE.repoUrl },
      { label: "Discussions", href: `${SITE.repoUrl}/discussions` },
      { label: "Issues", href: `${SITE.repoUrl}/issues` },
      { label: "Contributors", to: "/contributors" },
      { label: "Star gazers", to: "/star-gazers" },
      { label: "Community", to: "/community" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Brand assets", to: "/brand" },
      { label: "OpenCode (upstream)", href: "https://opencode.ai" },
      { label: "MiMo-Code", href: "https://github.com/XiaomiMiMo/MiMo-Code" },
      { label: "View site source", href: SITE.repoUrl },
    ],
  },
] as const;

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 mt-32">
      <div className="mx-auto max-w-7xl px-4 md:px-6 py-16">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-10">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <span className="font-mono text-lavender text-2xl leading-none">»</span>
              <span className="font-display font-semibold">async-coder</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed max-w-xs">
              The async coding agent for every model. MIT-licensed. Built in the open.
            </p>
            <div className="mt-5 flex items-center gap-3">
              <a
                href={SITE.repoUrl}
                target="_blank"
                rel="noreferrer"
                className="text-muted-foreground hover:text-lavender transition-colors"
                aria-label="GitHub"
              >
                <Github className="w-4 h-4" />
              </a>
            </div>
          </div>

          {COLS.map((col) => (
            <div key={col.title}>
              <h4 className="text-xs font-semibold tracking-widest uppercase text-foreground/80 mb-4">
                {col.title}
              </h4>
              <ul className="space-y-2.5">
                {col.links.map((l: any) =>
                  l.to ? (
                    <li key={l.label}>
                      <Link
                        to={l.to}
                        className="text-sm text-muted-foreground hover:text-lavender transition-colors"
                      >
                        {l.label}
                      </Link>
                    </li>
                  ) : (
                    <li key={l.label}>
                      <a
                        href={l.href}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm text-muted-foreground hover:text-lavender transition-colors"
                      >
                        {l.label}
                      </a>
                    </li>
                  ),
                )}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 pt-8 border-t border-border/60 flex flex-col md:flex-row md:items-center md:justify-between gap-4 text-xs text-muted-foreground">
          <p>
            <span className="font-mono text-lavender">»</span> async-coder · MIT License ·
            Built with TanStack Start + Tailwind + shadcn/ui
          </p>
          <p className="max-w-2xl md:text-right">
            Independent fork of OpenCode (sst/opencode) originally via MiMo-Code. All
            Xiaomi/MiMo trademarks, telemetry, and platform integrations removed.
          </p>
        </div>
      </div>
    </footer>
  );
}
