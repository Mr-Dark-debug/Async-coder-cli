import { defineEventHandler, createError } from "h3";
import { getRepoStats, getContributors, getReleases } from "../../src/lib/github.functions";

export default defineEventHandler(async (event) => {
  try {
    const [stats, contributors, releases] = await Promise.all([
      getRepoStats(),
      getContributors(),
      getReleases(),
    ]);

    let npmDownloads = 1250; // Fallback default
    try {
      const npmRes = await fetch("https://api.npmjs.org/downloads/point/last-week/async-coder");
      if (npmRes.ok) {
        const data = await npmRes.json();
        if (data && typeof data.downloads === "number") {
          npmDownloads = data.downloads;
        }
      }
    } catch (err) {
      console.error("Failed to fetch npm downloads", err);
    }

    // Set custom cache headers on the h3 response event
    event.node.res.setHeader("Content-Type", "application/json");
    event.node.res.setHeader("Cache-Control", "public, max-age=3600, stale-while-revalidate=600");

    return {
      stars: stats.stars,
      forks: stats.forks,
      watchers: stats.watchers,
      contributorsCount: contributors.length,
      contributors: contributors,
      releases: releases,
      npmDownloads,
      updatedAt: new Date().toISOString(),
    };
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      statusMessage: error.message || "Internal server error",
    });
  }
});
