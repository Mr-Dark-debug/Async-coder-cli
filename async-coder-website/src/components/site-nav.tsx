import { Link, useRouterState } from "@tanstack/react-router";
import { ArrowUpRight, Menu, Moon, Search, Sparkles, Star, Sun, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { NAV, SITE } from "@/lib/site";
import { getRepoStats } from "@/lib/github.functions";
import { useTheme } from "./theme-provider";
import { CommandPalette } from "./command-palette";

/** Floating glassmorphic pill navigation. */
export function SiteNav() {
  const [open, setOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { theme, toggle } = useTheme();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const { data: stats } = useQuery({
    queryKey: ["repo-stats"],
    queryFn: () => getRepoStats(),
    staleTime: 60 * 60 * 1000,
    retry: 1,
  });

  const stars = stats?.stars ?? 0;
  const starsLabel =
    stars >= 1000 ? `${(stars / 1000).toFixed(1)}k` : stars > 0 ? String(stars) : "Star";

  return (
    <>
      <header className="fixed top-3.5 inset-x-0 z-50 px-3 md:px-6 pointer-events-none">
        <div
          className={`pointer-events-auto mx-auto max-w-5xl rounded-full glass-nav transition-all duration-300 ${
            scrolled ? "shadow-xl ring-1 ring-black/5 dark:ring-white/10" : ""
          }`}
        >
          <div className="h-12 pl-3.5 pr-2 flex items-center justify-between gap-2">
            <Link to="/" className="flex items-center gap-2.5 group shrink-0">
              <div className="relative">
                <img
                  src="/mark.svg"
                  alt="async-coder"
                  className="w-7 h-7 rounded-[9px] transition-transform duration-300 group-hover:scale-105"
                />
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <span className="font-serif-display text-[22px] tracking-tight leading-none text-foreground">
                async-coder
              </span>
              <span className="hidden xl:inline-flex items-center gap-1 text-[10.5px] font-mono text-muted-foreground border border-border/70 rounded-full px-2 py-0.5 bg-background/50">
                {SITE.version}
              </span>
            </Link>

            <nav className="hidden md:flex items-center gap-1">
              {NAV.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="px-3.5 py-1.5 text-[13px] font-medium text-muted-foreground hover:text-foreground transition-all duration-200 rounded-full hover:bg-foreground/[0.04]"
                  activeProps={{
                    className:
                      "px-3.5 py-1.5 text-[13px] font-medium text-foreground rounded-full bg-foreground/[0.07] shadow-xs",
                  }}
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPaletteOpen(true)}
                aria-label="Search documentation"
                className="hidden lg:inline-flex items-center gap-2 h-8 px-2.5 text-xs text-muted-foreground rounded-full hover:text-foreground hover:bg-foreground/[0.05] transition-colors border border-border/40"
              >
                <Search className="w-3.5 h-3.5" />
                <span className="text-[11px] font-mono opacity-70">⌘K</span>
              </button>

              <a
                href={SITE.repoUrl}
                target="_blank"
                rel="noreferrer"
                className="hidden sm:inline-flex items-center gap-1.5 h-8 px-2.5 text-xs font-medium rounded-full hover:bg-foreground/[0.05] transition-colors border border-border/40"
              >
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                <span className="font-mono text-[11px]">{starsLabel}</span>
              </a>

              <button
                onClick={toggle}
                aria-label="Toggle theme"
                className="inline-flex items-center justify-center w-8 h-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-foreground/[0.05] transition-colors"
              >
                {theme === "dark" ? (
                  <Sun className="w-4 h-4 text-amber-300" />
                ) : (
                  <Moon className="w-4 h-4" />
                )}
              </button>

              <Link
                to="/docs/quickstart"
                className="inline-flex items-center gap-1.5 h-8 px-3.5 text-[12.5px] font-medium rounded-full bg-foreground text-background hover:opacity-90 active:scale-[0.98] transition-all whitespace-nowrap shadow-xs"
              >
                <span>Get started</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>

              <button
                onClick={() => setOpen((o) => !o)}
                className="md:hidden inline-flex items-center justify-center w-8 h-8 rounded-full hover:bg-foreground/[0.05]"
                aria-label="Menu"
              >
                {open ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {open && (
            <div className="md:hidden border-t border-border/60 px-3 py-3 animate-float-up">
              <nav className="flex flex-col gap-1">
                {NAV.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    className="px-3.5 py-2 text-sm font-medium text-muted-foreground hover:text-foreground rounded-xl hover:bg-foreground/[0.05]"
                  >
                    {item.label}
                  </Link>
                ))}
                <div className="mt-2 pt-2 border-t border-border/40 flex items-center justify-between">
                  <a
                    href={SITE.repoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"
                  >
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                    <span>GitHub ({starsLabel})</span>
                  </a>
                  <button
                    onClick={() => {
                      setOpen(false);
                      setPaletteOpen(true);
                    }}
                    className="text-xs text-muted-foreground flex items-center gap-1"
                  >
                    <Search className="w-3.5 h-3.5" />
                    <span>Search</span>
                  </button>
                </div>
              </nav>
            </div>
          )}
        </div>
      </header>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </>
  );
}
