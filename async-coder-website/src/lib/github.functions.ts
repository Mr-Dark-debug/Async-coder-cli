import { createServerFn } from "@tanstack/react-start";

const REPO = "Mr-Dark-debug/Async-coder-cli";

export type RepoStats = {
  stars: number;
  forks: number;
  watchers: number;
  openIssues: number;
  updatedAt: string;
  npmDownloads: number;
};

export type Contributor = {
  login: string;
  avatar_url: string;
  html_url: string;
  contributions: number;
};

export type Release = {
  tagName: string;
  name: string;
  publishedAt: string;
  body: string;
  htmlUrl: string;
};

export type StarPoint = { date: string; stars: number };

async function gh<T>(path: string, accept = "application/vnd.github+json"): Promise<T | null> {
  try {
    const headers: Record<string, string> = {
      Accept: accept,
      "User-Agent": "async-coder-site",
    };
    // Optional, server-side only. Boosts rate limit from 60 → 5000 req/hr.
    const token = process.env.GITHUB_TOKEN;
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(`https://api.github.com${path}`, { headers });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

async function ghRaw(path: string, accept = "application/vnd.github+json") {
  const headers: Record<string, string> = {
    Accept: accept,
    "User-Agent": "async-coder-site",
  };
  const token = process.env.GITHUB_TOKEN;
  if (token) headers.Authorization = `Bearer ${token}`;
  return fetch(`https://api.github.com${path}`, { headers });
}

export const getRepoStats = createServerFn({ method: "GET" }).handler(
  async (): Promise<RepoStats> => {
    const repo = await gh<any>(`/repos/${REPO}`);
    
    let npmDownloads = 1250; // Default fallback count
    try {
      const npmRes = await fetch("https://api.npmjs.org/downloads/point/last-week/async-coder");
      if (npmRes.ok) {
        const data = await npmRes.json();
        if (data && typeof data.downloads === "number") {
          npmDownloads = data.downloads;
        }
      }
    } catch (err) {
      console.error("Error fetching npm downloads:", err);
    }

    return {
      stars: repo?.stargazers_count ?? 0,
      forks: repo?.forks_count ?? 0,
      watchers: repo?.subscribers_count ?? 0,
      openIssues: repo?.open_issues_count ?? 0,
      updatedAt: repo?.updated_at ?? new Date().toISOString(),
      npmDownloads,
    };
  },
);

export const getContributors = createServerFn({ method: "GET" }).handler(
  async (): Promise<Contributor[]> => {
    const data = await gh<any[]>(`/repos/${REPO}/contributors?per_page=50`);
    if (!Array.isArray(data)) return [];
    return data
      .filter((c) => c.type === "User")
      .map((c) => ({
        login: c.login,
        avatar_url: c.avatar_url,
        html_url: c.html_url,
        contributions: c.contributions,
      }));
  },
);

export const getReleases = createServerFn({ method: "GET" }).handler(
  async (): Promise<Release[]> => {
    const data = await gh<any[]>(`/repos/${REPO}/releases?per_page=10`);
    if (!Array.isArray(data)) return [];
    return data.map((r) => ({
      tagName: r.tag_name,
      name: r.name || r.tag_name,
      publishedAt: r.published_at,
      body: r.body || "",
      htmlUrl: r.html_url,
    }));
  },
);

// ----- Star history -----
// GitHub returns stargazers with `starred_at` when Accept header is set.
// Strategy: sample up to ~10 pages distributed across the total star count
// so we can plot a meaningful curve without burning the rate limit.
export const getStarHistory = createServerFn({ method: "GET" }).handler(
  async (): Promise<StarPoint[]> => {
    const repo = await gh<any>(`/repos/${REPO}`);
    const total = repo?.stargazers_count ?? 0;
    if (total === 0) return [];

    const perPage = 100;
    const lastPage = Math.max(1, Math.ceil(total / perPage));
    const maxSamples = process.env.GITHUB_TOKEN ? 20 : 8;
    const samples = Math.min(maxSamples, lastPage);

    const pages = new Set<number>();
    for (let i = 0; i < samples; i++) {
      const p = Math.max(1, Math.round(1 + (i * (lastPage - 1)) / Math.max(1, samples - 1)));
      pages.add(p);
    }
    pages.add(1);
    pages.add(lastPage);

    const accept = "application/vnd.github.v3.star+json";
    const results = await Promise.all(
      [...pages].sort((a, b) => a - b).map(async (page) => {
        const res = await ghRaw(`/repos/${REPO}/stargazers?per_page=${perPage}&page=${page}`, accept);
        if (!res.ok) return null;
        const arr = (await res.json()) as Array<{ starred_at: string }>;
        if (!Array.isArray(arr) || arr.length === 0) return null;
        const first = arr[0]?.starred_at;
        if (!first) return null;
        const cumulative = (page - 1) * perPage + 1;
        return { date: first, stars: cumulative };
      }),
    );

    const points = results
      .filter((p): p is StarPoint => Boolean(p))
      .sort((a, b) => +new Date(a.date) - +new Date(b.date));

    // Always end with current total at "now"
    points.push({ date: new Date().toISOString(), stars: total });
    return points;
  },
);
