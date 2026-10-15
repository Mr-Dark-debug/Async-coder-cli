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
    <footer className="mt-16 md:mt-24 border-t border-border">
      <div className="mx-auto max-w-6xl px-5 md:px-8 py-16">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-10">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2.5 mb-4">
              <img src="/mark.svg" alt="" className="w-8 h-8 rounded-[10px]" />
              <span className="font-serif text-2xl leading-none">async-coder</span>
            </div>
            <p className="text-[13px] text-muted-foreground leading-relaxed max-w-xs">
              A coding agent that keeps working while you are away. MIT licensed, built in the open.
            </p>
            <div className="mt-5 flex items-center gap-3">
              <a
                href={SITE.repoUrl}
                target="_blank"
                rel="noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
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
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
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
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
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
          <p>async-coder · MIT License · Built with TanStack Start and Tailwind</p>
          <p className="max-w-2xl md:text-right">
            Independent fork of OpenCode (sst/opencode) originally via MiMo-Code. All Xiaomi/MiMo
            trademarks, telemetry, and platform integrations removed.
          </p>
        </div>
      </div>
    </footer>
  );
}
