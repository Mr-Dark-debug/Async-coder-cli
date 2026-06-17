import { type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site-layout";
import { ArrowUpRight } from "lucide-react";

export const DOCS_NAV = [
  {
    section: "Getting started",
    items: [
      { to: "/docs", label: "Introduction" },
      { to: "/docs/quickstart", label: "Quickstart" },
      { to: "/docs/configuration", label: "Configuration" },
    ],
  },
  {
    section: "Providers",
    items: [
      { to: "/docs/providers", label: "Overview" },
      { to: "/docs/providers/groq", label: "Groq" },
      { to: "/docs/providers/openrouter", label: "OpenRouter" },
      { to: "/docs/providers/openai", label: "OpenAI" },
      { to: "/docs/providers/anthropic", label: "Anthropic" },
      { to: "/docs/providers/google", label: "Google" },
      { to: "/docs/providers/xai", label: "xAI" },
      { to: "/docs/providers/copilot", label: "GitHub Copilot" },
      { to: "/docs/providers/custom", label: "Custom (OpenAI-compatible)" },
    ],
  },
  {
    section: "Features",
    items: [
      { to: "/docs/websearch", label: "Web search" },
      { to: "/docs/usage", label: "Usage dashboard" },
      { to: "/docs/memory", label: "Persistent memory" },
      { to: "/docs/subagents", label: "Subagents" },
      { to: "/docs/compose", label: "Compose" },
      { to: "/docs/dream-distill", label: "Dream & Distill" },
    ],
  },
  {
    section: "Guides",
    items: [
      { to: "/docs/migration", label: "Migrate from MiMo-Code" },
      { to: "/docs/self-hosting", label: "Self-hosting" },
      { to: "/docs/api", label: "SDK reference" },
      { to: "/docs/faq", label: "FAQ" },
    ],
  },
];

export function DocsLayout({
  children,
  title,
  description,
  toc,
}: {
  children: ReactNode;
  title: string;
  description?: string;
  toc?: { id: string; label: string }[];
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  // Flatten all items to find prev and next
  const allNavItems = DOCS_NAV.flatMap((section) =>
    section.items.map((item) => ({ ...item, section: section.section }))
  );
  
  const currentIndex = allNavItems.findIndex((item) => item.to === pathname);
  const prevItem = currentIndex > 0 ? allNavItems[currentIndex - 1] : null;
  const nextItem = currentIndex !== -1 && currentIndex < allNavItems.length - 1 ? allNavItems[currentIndex + 1] : null;

  const currentItem = allNavItems.find((item) => item.to === pathname);
  const sectionLabel = currentItem ? currentItem.section : "Docs";
  const itemLabel = currentItem ? currentItem.label : title;

  return (
    <SiteLayout>
      <div className="mx-auto max-w-7xl px-4 md:px-6 py-10 md:py-14">
        <div className="grid grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)_200px] gap-10">
          {/* Sidebar */}
          <aside className="lg:sticky lg:top-20 lg:self-start lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
            <nav className="space-y-7 text-sm">
              {DOCS_NAV.map((s) => (
                <div key={s.section}>
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium mb-2.5">
                    {s.section}
                  </div>
                  <ul className="space-y-0.5">
                    {s.items.map((i) => {
                      const active = pathname === i.to;
                      return (
                        <li key={i.to}>
                          <Link
                            to={i.to}
                            className={`block px-2.5 py-1.5 rounded-md text-[13px] transition-colors ${
                              active
                                ? "bg-lavender/15 text-lavender border-l-2 border-lavender pl-2"
                                : "text-muted-foreground hover:text-foreground hover:bg-accent/40"
                            }`}
                          >
                            {i.label}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </nav>
          </aside>

          {/* Content */}
          <article className="min-w-0">
            {/* Breadcrumbs */}
            <nav className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono mb-4 flex-wrap">
              <Link to="/docs" className="hover:text-lavender transition-colors">Docs</Link>
              {sectionLabel !== "Docs" && (
                <>
                  <span className="text-muted-foreground/40">/</span>
                  <span className="text-muted-foreground/80">{sectionLabel}</span>
                </>
              )}
              {itemLabel && (
                <>
                  <span className="text-muted-foreground/40">/</span>
                  <span className="text-lavender font-medium">{itemLabel}</span>
                </>
              )}
            </nav>

            <h1 className="font-display text-3xl md:text-4xl font-semibold tracking-tight">
              {title}
            </h1>
            {description && (
              <p className="mt-3 text-muted-foreground text-base leading-relaxed">
                {description}
              </p>
            )}
            <div className="mt-8 prose-doc">{children}</div>

            {/* Prev/Next Pagination */}
            {(prevItem || nextItem) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-12 pt-8 border-t border-border/60">
                {prevItem ? (
                  <Link
                    to={prevItem.to}
                    className="group rounded-lg border border-border/60 bg-panel/30 p-4 hover:border-lavender/40 transition-colors flex flex-col text-left"
                  >
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
                      Previous
                    </span>
                    <span className="text-[14px] font-semibold text-foreground group-hover:text-lavender mt-1 inline-flex items-center gap-1">
                      &larr; {prevItem.label}
                    </span>
                  </Link>
                ) : (
                  <div />
                )}
                {nextItem ? (
                  <Link
                    to={nextItem.to}
                    className="group rounded-lg border border-border/60 bg-panel/30 p-4 hover:border-lavender/40 transition-colors flex flex-col text-right items-end"
                  >
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
                      Next
                    </span>
                    <span className="text-[14px] font-semibold text-foreground group-hover:text-lavender mt-1 inline-flex items-center gap-1">
                      {nextItem.label} &rarr;
                    </span>
                  </Link>
                ) : (
                  <div />
                )}
              </div>
            )}

            <footer className="mt-8 pt-6 border-t border-border/60 flex items-center justify-between text-sm">
              <a
                href={`https://github.com/Mr-Dark-debug/Async-coder-cli/edit/main/docs${pathname.replace(
                  "/docs",
                  "",
                )}.mdx`}
                target="_blank"
                rel="noreferrer"
                className="text-muted-foreground hover:text-lavender inline-flex items-center gap-1"
              >
                Edit this page on GitHub <ArrowUpRight className="w-3 h-3" />
              </a>
            </footer>
          </article>

          {/* TOC */}
          <aside className="hidden lg:block lg:sticky lg:top-20 lg:self-start">
            {toc && toc.length > 0 && (
              <div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium mb-2.5">
                  On this page
                </div>
                <ul className="space-y-1.5 text-[13px]">
                  {toc.map((t) => (
                    <li key={t.id}>
                      <a
                        href={`#${t.id}`}
                        className="text-muted-foreground hover:text-lavender block py-0.5"
                      >
                        {t.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </aside>
        </div>
      </div>
    </SiteLayout>
  );
}

// Small Markdown-ish helpers for hand-authored doc pages
export function H2({ id, children }: { id: string; children: ReactNode }) {
  return (
    <h2
      id={id}
      className="font-display text-2xl font-semibold mt-12 mb-4 scroll-mt-24 tracking-tight"
    >
      {children}
    </h2>
  );
}

export function P({ children }: { children: ReactNode }) {
  return <p className="text-[15px] text-muted-foreground leading-relaxed mb-4">{children}</p>;
}

export function UL({ children }: { children: ReactNode }) {
  return (
    <ul className="list-disc pl-6 space-y-1.5 text-[15px] text-muted-foreground mb-4 marker:text-lavender">
      {children}
    </ul>
  );
}

export function InlineCode({ children }: { children: ReactNode }) {
  return (
    <code className="font-mono text-[0.9em] px-1.5 py-0.5 rounded bg-elevated border border-border/60 text-foreground">
      {children}
    </code>
  );
}
