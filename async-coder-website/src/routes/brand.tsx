import { createFileRoute } from "@tanstack/react-router";
import { Page } from "@/components/page";
import { Download } from "lucide-react";

const PALETTE = [
  { name: "Lavender", hex: "#B197FC", role: "Primary brand" },
  { name: "Lavender Soft", hex: "#D0BFFF", role: "Hover / glow" },
  { name: "Lavender Deep", hex: "#9775FA", role: "Secondary" },
  { name: "Accent Blue", hex: "#748FFC", role: "Cool accent" },
  { name: "Background", hex: "#0A0A0A", role: "Dark canvas" },
  { name: "Panel", hex: "#141414", role: "Cards" },
];

export const Route = createFileRoute("/brand")({
  head: () => ({
    meta: [
      { title: "Brand — async-coder" },
      { name: "description", content: "Logos, color palette, and usage guidelines." },
      { property: "og:title", content: "Brand — async-coder" },
      { property: "og:url", content: "/brand" },
    ],
    links: [{ rel: "canonical", href: "/brand" }],
  }),
  component: BrandPage,
});

function BrandPage() {
  return (
    <Page
      eyebrow="Brand"
      title="Brand assets."
      description="Use these freely to make async-coder-themed content — posts, talks, packaging, anything."
    >
      <section className="mb-14">
        <h2 className="font-display text-2xl font-semibold mb-6">Logo assets</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-xl border border-border/60 bg-panel/40 p-8 flex flex-col items-center justify-between min-h-[240px]">
            <div className="flex-1 flex items-center justify-center">
              <img src="/logo.svg" alt="async-coder wordmark" className="h-10 w-auto" />
            </div>
            <div className="w-full mt-6 pt-4 border-t border-border/40 flex items-center justify-between">
              <div>
                <div className="font-medium text-sm text-foreground">Wordmark Logo</div>
                <div className="text-xs text-muted-foreground mt-0.5">SVG vector format</div>
              </div>
              <a
                href="/logo.svg"
                download="async-coder-logo.svg"
                className="inline-flex items-center justify-center gap-1.5 h-9 px-3.5 rounded bg-lavender text-primary-foreground text-xs font-semibold hover:bg-lavender-soft transition-colors"
              >
                <Download className="w-3.5 h-3.5" /> Download
              </a>
            </div>
          </div>

          <div className="rounded-xl border border-border/60 bg-panel/40 p-8 flex flex-col items-center justify-between min-h-[240px]">
            <div className="flex-1 flex items-center justify-center">
              <img src="/mark.svg" alt="async-coder mark" className="h-12 w-auto" />
            </div>
            <div className="w-full mt-6 pt-4 border-t border-border/40 flex items-center justify-between">
              <div>
                <div className="font-medium text-sm text-foreground">Icon Mark</div>
                <div className="text-xs text-muted-foreground mt-0.5">SVG vector format</div>
              </div>
              <a
                href="/mark.svg"
                download="async-coder-mark.svg"
                className="inline-flex items-center justify-center gap-1.5 h-9 px-3.5 rounded bg-lavender text-primary-foreground text-xs font-semibold hover:bg-lavender-soft transition-colors"
              >
                <Download className="w-3.5 h-3.5" /> Download
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="mb-14">
        <h2 className="font-display text-2xl font-semibold mb-6">Color palette</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {PALETTE.map((c) => (
            <div key={c.hex} className="rounded-xl border border-border/60 overflow-hidden">
              <div className="h-24" style={{ background: c.hex }} />
              <div className="p-4 bg-panel/60">
                <div className="font-medium">{c.name}</div>
                <div className="font-mono text-xs text-muted-foreground mt-0.5">{c.hex}</div>
                <div className="text-xs text-muted-foreground mt-2">{c.role}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-display text-2xl font-semibold mb-4">Usage guidelines</h2>
        <ul className="space-y-3 text-muted-foreground">
          <li>
            <span className="text-foreground font-medium">Do:</span> use lavender (#B197FC) as the
            single accent color. Pair with deep neutrals.
          </li>
          <li>
            <span className="text-foreground font-medium">Do:</span> use the » mark on its own as a
            compact identifier.
          </li>
          <li>
            <span className="text-foreground font-medium">Don't:</span> use orange, yellow, or
            bright purple — those belong to other tools.
          </li>
          <li>
            <span className="text-foreground font-medium">Don't:</span> imply endorsement by
            Xiaomi, MiMo, or the OpenCode team.
          </li>
        </ul>
      </section>
    </Page>
  );
}
