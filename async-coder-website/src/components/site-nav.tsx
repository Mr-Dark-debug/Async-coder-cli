import { Link, useRouterState } from "@tanstack/react-router";
import { ArrowUpRight, Menu, Moon, Search, Star, Sun, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { NAV, SITE } from "@/lib/site";
import { getRepoStats } from "@/lib/github.functions";
import { useTheme } from "./theme-provider";
import { CommandPalette } from "./command-palette";

/** Floating pill navigation. Becomes more opaque once the page scrolls. */
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
      <header className="fixed top-3 inset-x-0 z-50 px-3 md:px-6 pointer-events-none">
        <div
          className={`pointer-events-auto mx-auto max-w-5xl rounded-full glass-nav transition-all duration-300 ${
            scrolled ? "shadow-lg" : ""
          }`}
        >
          <div className="h-12 pl-3 pr-1.5 flex items-center justify-between gap-2">
            <Link to="/" className="flex items-center gap-2 group shrink-0">
              <img src="/mark.svg" alt="" className="w-7 h-7 rounded-[9px]" />
              <span className="font-serif text-[22px] leading-none tracking-tight">
                async-coder
              </span>
              <span className="hidden xl:inline text-[10px] font-mono text-muted-foreground border border-border rounded-full px-1.5 py-0.5">
                {SITE.version}
              </span>
            </Link>

            <nav className="hidden md:flex items-center gap-0.5">
              {NAV.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="px-3 py-1.5 text-[13px] text-muted-foreground hover:text-foreground transition-colors rounded-full"
                  activeProps={{
                    className:
                      "px-3 py-1.5 text-[13px] text-foreground rounded-full bg-foreground/[0.06]",
                  }}
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPaletteOpen(true)}
                aria-label="Search"
                className="hidden lg:inline-flex items-center gap-2 h-9 px-3 text-xs text-muted-foreground rounded-full hover:text-foreground hover:bg-foreground/[0.05] transition-colors"
              >
                <Search className="w-3.5 h-3.5" />
                <kbd className="font-mono text-[10px] bg-foreground/[0.06] px-1.5 py-0.5 rounded-full">
                  ⌘K
                </kbd>
              </button>

              <a
                href={SITE.repoUrl}
                target="_blank"
                rel="noreferrer"
                className="hidden lg:inline-flex items-center gap-1.5 h-9 px-3 text-xs rounded-full hover:bg-foreground/[0.05] transition-colors"
              >
                <Star className="w-3.5 h-3.5" />
                <span className="font-mono">{starsLabel}</span>
              </a>

              <button
                onClick={toggle}
                aria-label="Toggle theme"
                className="inline-flex items-center justify-center w-9 h-9 rounded-full text-muted-foreground hover:text-foreground hover:bg-foreground/[0.05] transition-colors"
              >
                {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>

              <Link
                to="/docs/quickstart"
                className="hidden sm:inline-flex items-center gap-1 h-9 px-4 text-[13px] font-medium rounded-full bg-foreground text-background hover:opacity-90 transition-opacity whitespace-nowrap"
              >
                Get started <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>

              <button
                onClick={() => setOpen((o) => !o)}
                className="md:hidden inline-flex items-center justify-center w-9 h-9 rounded-full hover:bg-foreground/[0.05]"
                aria-label="Menu"
              >
                {open ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {open && (
            <div className="md:hidden border-t border-border px-3 py-3">
              <nav className="flex flex-col gap-0.5">
                {NAV.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground rounded-xl hover:bg-foreground/[0.05]"
                  >
                    {item.label}
                  </Link>
                ))}
                <Link
                  to="/docs/quickstart"
                  className="mt-1 px-3 py-2.5 text-sm font-medium rounded-xl bg-foreground text-background text-center"
                >
                  Get started
                </Link>
              </nav>
            </div>
          )}
        </div>
      </header>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </>
  );
}
