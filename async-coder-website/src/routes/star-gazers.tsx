import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Page } from "@/components/page";
import { getStarHistory, getRepoStats } from "@/lib/github.functions";
import { Star, TrendingUp, ExternalLink } from "lucide-react";
import { SITE } from "@/lib/site";
import { useMemo } from "react";

export const Route = createFileRoute("/star-gazers")({
  head: () => ({
    meta: [
      { title: "Star history — async-coder" },
      {
        name: "description",
        content:
          "Live GitHub star history for async-coder, sampled directly from the GitHub stargazers API.",
      },
      { property: "og:title", content: "Star history — async-coder" },
      { property: "og:url", content: "/star-gazers" },
    ],
    links: [{ rel: "canonical", href: "/star-gazers" }],
  }),
  component: StarGazersPage,
});

function StarGazersPage() {
  const { data: stats } = useQuery({
    queryKey: ["repo-stats"],
    queryFn: () => getRepoStats(),
    staleTime: 60 * 60 * 1000,
  });
  const { data: history = [], isLoading } = useQuery({
    queryKey: ["star-history"],
    queryFn: () => getStarHistory(),
    staleTime: 60 * 60 * 1000,
  });

  return (
    <Page
      eyebrow="Star gazers"
      title="People who starred async-coder."
      description="A live history of GitHub stars, sampled from the stargazers API. Every star is a maintainer, a developer, a curious skeptic — thank you."
    >
      <div className="grid md:grid-cols-3 gap-4 mb-10">
        <StatCard icon={Star} label="Total stars" value={stats?.stars ?? 0} />
        <StatCard icon={TrendingUp} label="Forks" value={stats?.forks ?? 0} />
        <StatCard icon={Star} label="Watchers" value={stats?.watchers ?? 0} />
      </div>

      <div className="rounded-2xl border border-border/60 bg-elevated/40 p-4 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-xs uppercase tracking-widest text-muted-foreground font-mono">
              Star history
            </div>
            <div className="font-display font-semibold text-lg mt-0.5">
              {SITE.repo}
            </div>
          </div>
          <a
            href={`${SITE.repoUrl}/stargazers`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-lavender hover:underline"
          >
            View on GitHub <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {isLoading ? (
          <div className="h-[320px] flex items-center justify-center text-sm text-muted-foreground font-mono">
            Sampling stargazers…
          </div>
        ) : history.length < 2 ? (
          <div className="h-[320px] flex items-center justify-center text-sm text-muted-foreground font-mono">
            Not enough star data yet. Be the first ★
          </div>
        ) : (
          <StarChart points={history} />
        )}
      </div>

      <div className="mt-8 rounded-xl border border-lavender/30 bg-lavender/5 p-5 flex items-center justify-between flex-wrap gap-3">
        <p className="text-sm text-muted-foreground max-w-xl">
          If you've made it this far, drop a ★ — it genuinely helps new contributors find the project.
        </p>
        <a
          href={SITE.repoUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 h-10 px-4 rounded-md bg-lavender text-primary-foreground text-sm font-medium hover:bg-lavender-soft"
        >
          <Star className="w-4 h-4" /> Star on GitHub
        </a>
      </div>
    </Page>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: typeof Star; label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border/60 bg-elevated/40 p-5">
      <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground font-mono">
        <Icon className="w-3.5 h-3.5 text-lavender" /> {label}
      </div>
      <div className="mt-2 text-3xl font-display font-semibold tabular-nums">
        {value.toLocaleString()}
      </div>
    </div>
  );
}

function StarChart({ points }: { points: { date: string; stars: number }[] }) {
  const w = 800;
  const h = 320;
  const pad = { top: 20, right: 16, bottom: 28, left: 44 };

  const { path, area, xTicks, yTicks } = useMemo(() => {
    const xs = points.map((p) => +new Date(p.date));
    const ys = points.map((p) => p.stars);
    const xMin = Math.min(...xs);
    const xMax = Math.max(...xs);
    const yMin = 0;
    const yMax = Math.max(...ys);

    const sx = (x: number) =>
      pad.left + ((x - xMin) / Math.max(1, xMax - xMin)) * (w - pad.left - pad.right);
    const sy = (y: number) =>
      h - pad.bottom - ((y - yMin) / Math.max(1, yMax - yMin)) * (h - pad.top - pad.bottom);

    const d = points
      .map((p, i) => `${i === 0 ? "M" : "L"}${sx(+new Date(p.date)).toFixed(1)},${sy(p.stars).toFixed(1)}`)
      .join(" ");

    const a = `${d} L${sx(xMax).toFixed(1)},${(h - pad.bottom).toFixed(1)} L${sx(xMin).toFixed(1)},${(h - pad.bottom).toFixed(1)} Z`;

    const xTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => {
      const ms = xMin + t * (xMax - xMin);
      const d = new Date(ms);
      return {
        x: sx(ms),
        label: d.toLocaleDateString(undefined, { month: "short", year: "2-digit" }),
      };
    });
    const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => ({
      y: sy(yMax * t),
      label: Math.round(yMax * t).toLocaleString(),
    }));

    return { path: d, area: a, xTicks, yTicks };
  }, [points]);

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto" role="img" aria-label="Star history chart">
      <defs>
        <linearGradient id="star-area" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="var(--lavender)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="var(--lavender)" stopOpacity="0" />
        </linearGradient>
      </defs>

      {yTicks.map((t, i) => (
        <g key={i}>
          <line
            x1={pad.left}
            x2={w - pad.right}
            y1={t.y}
            y2={t.y}
            stroke="currentColor"
            strokeOpacity="0.08"
          />
          <text
            x={pad.left - 8}
            y={t.y + 3}
            fontSize="10"
            textAnchor="end"
            fill="currentColor"
            opacity="0.5"
            fontFamily="JetBrains Mono, monospace"
          >
            {t.label}
          </text>
        </g>
      ))}

      {xTicks.map((t, i) => (
        <text
          key={i}
          x={t.x}
          y={h - 10}
          fontSize="10"
          textAnchor="middle"
          fill="currentColor"
          opacity="0.5"
          fontFamily="JetBrains Mono, monospace"
        >
          {t.label}
        </text>
      ))}

      <path d={area} fill="url(#star-area)" />
      <path d={path} fill="none" stroke="var(--lavender)" strokeWidth="2" strokeLinejoin="round" />

      {points.map((p, i) => {
        const x =
          pad.left +
          ((+new Date(p.date) - +new Date(points[0].date)) /
            Math.max(1, +new Date(points[points.length - 1].date) - +new Date(points[0].date))) *
            (w - pad.left - pad.right);
        const yMax = Math.max(...points.map((q) => q.stars));
        const y = h - pad.bottom - (p.stars / Math.max(1, yMax)) * (h - pad.top - pad.bottom);
        return (
          <circle key={i} cx={x} cy={y} r="3" fill="var(--lavender)" stroke="var(--background)" strokeWidth="1.5" />
        );
      })}
    </svg>
  );
}
