import { createFileRoute } from "@tanstack/react-router";
import { Page } from "@/components/page";
import { Github, MessageCircle, BookOpen, Heart } from "lucide-react";
import { SITE } from "@/lib/site";

const LINKS = [
  {
    icon: Github,
    title: "GitHub Discussions",
    body: "Ask questions, share workflows, request features.",
    href: `${SITE.repoUrl}/discussions`,
  },
  {
    icon: MessageCircle,
    title: "Issues",
    body: "Report a bug or follow open work.",
    href: `${SITE.repoUrl}/issues`,
  },
  {
    icon: BookOpen,
    title: "Contributing guide",
    body: "Everything you need to land your first PR.",
    href: `${SITE.repoUrl}/blob/main/CONTRIBUTING.md`,
  },
  {
    icon: Heart,
    title: "Code of Conduct",
    body: "Be kind. Be technical. Be inclusive.",
    href: `${SITE.repoUrl}/blob/main/CODE_OF_CONDUCT.md`,
  },
];

export const Route = createFileRoute("/community")({
  head: () => ({
    meta: [
      { title: "Community — async-coder" },
      { name: "description", content: "Discussions, issues, contributing guide, and more." },
      { property: "og:title", content: "Community — async-coder" },
      { property: "og:url", content: "/community" },
    ],
    links: [{ rel: "canonical", href: "/community" }],
  }),
  component: CommunityPage,
});

function CommunityPage() {
  return (
    <Page
      eyebrow="Community"
      title="Built with — and for — developers."
      description="async-coder is MIT-licensed. Everything happens in the open on GitHub."
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {LINKS.map((l) => (
          <a
            key={l.title}
            href={l.href}
            target="_blank"
            rel="noreferrer"
            className="group rounded-xl border border-border/60 bg-panel/40 p-6 hover:border-lavender/40 hover:-translate-y-0.5 transition-all"
          >
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-lavender/10 border border-lavender/20 text-lavender mb-4 group-hover:bg-lavender/20 transition-colors">
              <l.icon className="w-5 h-5" />
            </div>
            <h3 className="font-display font-semibold">{l.title}</h3>
            <p className="text-sm text-muted-foreground mt-1">{l.body}</p>
          </a>
        ))}
      </div>
    </Page>
  );
}
