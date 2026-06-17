import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getRepoStats, getContributors, getReleases } from "@/lib/github.functions";
import { motion } from "framer-motion";
import { Star, GitFork, Users, Package, Download, Clock, ArrowRight } from "lucide-react";
import { Link } from "@tanstack/react-router";

function useCountUp(target: number, duration = 1400) {
  const [n, setN] = useState(0);
  const ref = useRef<HTMLSpanElement | null>(null);
  const started = useRef(false);
  useEffect(() => {
    if (!ref.current || started.current) return;
    const io = new IntersectionObserver(
      (es) => {
        if (es[0]?.isIntersecting && !started.current) {
          started.current = true;
          const start = performance.now();
          const tick = (t: number) => {
            const p = Math.min(1, (t - start) / duration);
            setN(Math.round(target * (1 - Math.pow(1 - p, 3))));
            if (p < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.2 },
    );
    io.observe(ref.current);
    return () => io.disconnect();
  }, [target, duration]);
  return { n, ref };
}

function fmt(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
  return String(n);
}

function timeAgo(iso?: string) {
  if (!iso) return "—";
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export function CommunityStats() {
  const { data: stats } = useQuery({
    queryKey: ["repo-stats"],
    queryFn: () => getRepoStats(),
    staleTime: 60 * 60 * 1000,
  });
  const { data: contributors } = useQuery({
    queryKey: ["contributors"],
    queryFn: () => getContributors(),
    staleTime: 60 * 60 * 1000,
  });
  const { data: releases } = useQuery({
    queryKey: ["releases"],
    queryFn: () => getReleases(),
    staleTime: 60 * 60 * 1000,
  });

  const stars = useCountUp(stats?.stars ?? 0);
  const forks = useCountUp(stats?.forks ?? 0);
  const contribCount = useCountUp(contributors?.length ?? 0);
  const npmDownloads = useCountUp(stats?.npmDownloads ?? 0);

  return (
    <section className="py-20 md:py-24">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <div className="rounded-2xl border border-border/60 bg-panel/40 p-6 md:p-8">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6 text-center">
            {[
              { icon: Star, label: "stars", value: fmt(stars.n), ref: stars.ref },
              { icon: GitFork, label: "forks", value: fmt(forks.n), ref: forks.ref },
              { icon: Users, label: "contributors", value: String(contribCount.n), ref: contribCount.ref },
              { icon: Package, label: "version", value: releases?.[0]?.tagName ?? "v0.1.0" },
              { icon: Download, label: "weekly downloads", value: fmt(npmDownloads.n), ref: npmDownloads.ref },
            ].map((s) => (
              <div key={s.label}>
                <s.icon className="w-4 h-4 text-lavender mx-auto mb-2" />
                <div className="font-display text-2xl md:text-3xl font-semibold">
                  <span ref={s.ref as any}>{s.value}</span>
                </div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">
                  {s.label}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 pt-6 border-t border-border/60 flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            Updated {timeAgo(stats?.updatedAt)} · live from GitHub
          </div>
        </div>
      </div>
    </section>
  );
}

export function LatestReleases() {
  const { data: releases } = useQuery({
    queryKey: ["releases"],
    queryFn: () => getReleases(),
    staleTime: 60 * 60 * 1000,
  });

  const items =
    releases && releases.length
      ? releases.slice(0, 5)
      : [
          {
            tagName: "v0.1.0",
            name: "Initial rebrand release",
            publishedAt: new Date().toISOString(),
            body: "Lavender theme, Groq first-class, pluggable web search.",
            htmlUrl: "https://github.com/Mr-Dark-debug/Async-coder-cli/releases",
          },
        ];

  return (
    <section className="py-24 md:py-28">
      <div className="mx-auto max-w-5xl px-4 md:px-6">
        <div className="flex items-end justify-between gap-4 mb-10">
          <div>
            <div className="text-xs font-mono uppercase tracking-widest text-lavender mb-2">
              What's new
            </div>
            <h2 className="font-display text-3xl md:text-4xl font-semibold tracking-tight">
              Latest releases
            </h2>
          </div>
          <Link
            to="/changelog"
            className="text-sm text-lavender hover:text-lavender-soft inline-flex items-center gap-1"
          >
            Full changelog <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <ol className="relative space-y-4">
          {items.map((r, i) => (
            <motion.li
              key={r.tagName + i}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.35, delay: i * 0.04 }}
              className="rounded-xl border border-border/60 bg-panel/50 p-5 hover:border-lavender/40 transition-colors"
            >
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm px-2 py-0.5 rounded bg-lavender/15 text-lavender border border-lavender/30">
                    {r.tagName}
                  </span>
                  <span className="font-display font-semibold">{r.name}</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(r.publishedAt).toLocaleDateString()}
                </span>
              </div>
              <p className="mt-3 text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                {r.body.split("\n").slice(0, 3).join(" ").replace(/[#*`]/g, "") ||
                  "No description."}
              </p>
              <a
                href={r.htmlUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex items-center gap-1 text-xs text-lavender hover:text-lavender-soft"
              >
                View release notes <ArrowRight className="w-3 h-3" />
              </a>
            </motion.li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function ContributorsWall() {
  const { data: contributors } = useQuery({
    queryKey: ["contributors"],
    queryFn: () => getContributors(),
    staleTime: 60 * 60 * 1000,
  });

  return (
    <section className="py-24 md:py-28">
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <div className="max-w-2xl mb-10">
          <div className="text-xs font-mono uppercase tracking-widest text-lavender mb-2">
            Contributors
          </div>
          <h2 className="font-display text-3xl md:text-4xl font-semibold tracking-tight">
            Built in the open.
          </h2>
          <p className="mt-3 text-muted-foreground">
            async-coder stands on the shoulders of OpenCode and MiMo-Code.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          {(contributors ?? []).slice(0, 40).map((c) => (
            <a
              key={c.login}
              href={c.html_url}
              target="_blank"
              rel="noreferrer"
              title={`${c.login} · ${c.contributions} commits`}
              className="group relative"
            >
              <img
                src={c.avatar_url}
                alt={c.login}
                width={48}
                height={48}
                loading="lazy"
                className="w-12 h-12 rounded-full border-2 border-transparent group-hover:border-lavender transition-all"
              />
            </a>
          ))}
          {(!contributors || contributors.length === 0) &&
            Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="w-12 h-12 rounded-full bg-panel border border-border/60" />
            ))}
        </div>
        <div className="mt-6 text-sm text-muted-foreground">
          Want to contribute?{" "}
          <a
            href="https://github.com/Mr-Dark-debug/Async-coder-cli/blob/main/CONTRIBUTING.md"
            target="_blank"
            rel="noreferrer"
            className="text-lavender hover:underline"
          >
            Read the contributing guide →
          </a>
        </div>
      </div>
    </section>
  );
}
