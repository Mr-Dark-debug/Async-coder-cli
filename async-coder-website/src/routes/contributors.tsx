import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Page } from "@/components/page";
import { getContributors } from "@/lib/github.functions";

export const Route = createFileRoute("/contributors")({
  head: () => ({
    meta: [
      { title: "Contributors — async-coder" },
      { name: "description", content: "Everyone who has contributed code to async-coder." },
      { property: "og:title", content: "Contributors — async-coder" },
      { property: "og:url", content: "/contributors" },
    ],
    links: [{ rel: "canonical", href: "/contributors" }],
  }),
  component: ContributorsPage,
});

function ContributorsPage() {
  const { data } = useQuery({
    queryKey: ["contributors-full"],
    queryFn: () => getContributors(),
    staleTime: 60 * 60 * 1000,
  });
  const contributors = data ?? [];

  return (
    <Page
      eyebrow="Built in the open"
      title="The people behind async-coder."
      description="Plus a thank-you to the OpenCode and MiMo-Code maintainers, whose work this fork stands on."
    >
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {contributors.map((c) => (
          <a
            key={c.login}
            href={c.html_url}
            target="_blank"
            rel="noreferrer"
            className="group rounded-xl border border-border/60 bg-panel/40 p-5 flex items-center gap-4 hover:border-lavender/40 hover:-translate-y-0.5 transition-all"
          >
            <img
              src={c.avatar_url}
              alt={c.login}
              width={48}
              height={48}
              loading="lazy"
              className="w-12 h-12 rounded-full border-2 border-transparent group-hover:border-lavender transition-all"
            />
            <div className="min-w-0">
              <div className="font-medium truncate text-foreground">{c.login}</div>
              <div className="text-xs text-muted-foreground">{c.contributions} commits</div>
            </div>
          </a>
        ))}
        {contributors.length === 0 && (
          <div className="col-span-full text-center text-muted-foreground py-10">
            Contributor list is loading or unavailable right now.
          </div>
        )}
      </div>
    </Page>
  );
}
