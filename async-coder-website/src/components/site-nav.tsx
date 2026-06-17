import { Link, useRouterState } from "@tanstack/react-router";
import { Github, Menu, Moon, Search, Star, Sun, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { NAV, SITE } from "@/lib/site";
import { getRepoStats } from "@/lib/github.functions";
import { useTheme } from "./theme-provider";
import { CommandPalette } from "./command-palette";

export function SiteNav() {
  const [open, setOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { theme, toggle } = useTheme();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
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
  const starsLabel = stars >= 1000 ? `${(stars / 1000).toFixed(1)}k` : stars > 0 ? String(stars) : "★";

  return (
    <>
      <header
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
          scrolled ? "glass-nav" : "bg-transparent"
        }`}
      >
        <div className="mx-auto max-w-7xl px-4 md:px-6 h-14 md:h-16 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2 group">
            <span className="font-mono text-lavender text-xl leading-none">»</span>
            <span className="font-display font-semibold tracking-tight text-foreground">
              async-coder
            </span>
            <span className="hidden sm:inline text-[10px] font-mono text-muted-foreground border border-border/60 rounded px-1.5 py-0.5">
              {SITE.version}
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-md"
                activeProps={{ className: "px-3 py-1.5 text-sm text-foreground rounded-md bg-accent/40" }}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPaletteOpen(true)}
              aria-label="Search"
              className="hidden md:inline-flex items-center gap-2 h-9 px-3 text-xs text-muted-foreground rounded-md border border-border/60 hover:border-lavender/40 hover:text-foreground transition-colors"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Search</span>
              <kbd className="font-mono text-[10px] bg-accent/60 px-1.5 py-0.5 rounded">⌘K</kbd>
            </button>

            <a
              href={SITE.repoUrl}
              target="_blank"
              rel="noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 h-9 px-3 text-xs rounded-md border border-border/60 hover:border-lavender/40 transition-colors group"
            >
              <Star className="w-3.5 h-3.5 text-lavender group-hover:fill-lavender transition-all" />
              <span className="font-mono text-foreground">{starsLabel}</span>
              <span className="text-muted-foreground hidden lg:inline">stars</span>
            </a>

            <button
              onClick={toggle}
              aria-label="Toggle theme"
              className="inline-flex items-center justify-center w-9 h-9 rounded-md border border-border/60 hover:border-lavender/40 text-muted-foreground hover:text-foreground transition-colors"
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <a
              href={SITE.repoUrl}
              target="_blank"
              rel="noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 h-9 px-3 text-xs font-medium rounded-md bg-lavender text-primary-foreground hover:bg-lavender-soft transition-colors"
            >
              <Github className="w-3.5 h-3.5" />
              Star
            </a>

            <button
              onClick={() => setOpen((o) => !o)}
              className="md:hidden inline-flex items-center justify-center w-9 h-9 rounded-md border border-border/60"
              aria-label="Menu"
            >
              {open ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {open && (
          <div className="md:hidden border-t border-border/60 bg-background/95 backdrop-blur">
            <nav className="px-4 py-4 flex flex-col gap-1">
              {NAV.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground rounded-md"
                >
                  {item.label}
                </Link>
              ))}
              <a
                href={SITE.repoUrl}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground rounded-md inline-flex items-center gap-2"
              >
                <Github className="w-4 h-4" /> GitHub
              </a>
            </nav>
          </div>
        )}
      </header>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </>
  );
}
