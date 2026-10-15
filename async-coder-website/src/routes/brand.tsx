import { createFileRoute } from "@tanstack/react-router";
import { Page } from "@/components/page";
import { Download } from "lucide-react";

const PALETTE = [
  { name: "Lavender", hex: "#B197FC", role: "Primary brand" },
  { name: "Lavender light", hex: "#C4B1FF", role: "Highlights, gradients" },
  { name: "Lavender mid", hex: "#8F72F2", role: "Gradient end, links" },
  { name: "Lavender deep", hex: "#5B3FD1", role: "Text accents on paper" },
  { name: "Ink", hex: "#14102B", role: "Text and dark surfaces" },
  { name: "Paper", hex: "#F6F3FF", role: "Light surfaces" },
];

const ASSETS = [
  {
    file: "lockup-dark.svg",
    title: "Lockup",
    note: "Mark and wordmark, for light backgrounds",
    tone: "bg-white",
  },
  {
    file: "lockup-light.svg",
    title: "Lockup (light)",
    note: "Mark and wordmark, for dark backgrounds",
    tone: "bg-[#14102B]",
  },
  {
    file: "mark.svg",
    title: "App mark",
    note: "Squircle icon: prompt chevron in an orbit",
    tone: "bg-white",
  },
  {
    file: "glyph-lavender.svg",
    title: "Glyph",
    note: "Single-colour symbol; also glyph.svg in currentColor",
    tone: "bg-[#14102B]",
  },
] as const;

export const Route = createFileRoute("/brand")({
  head: () => ({
    meta: [
      { title: "Brand — async-coder" },
      { name: "description", content: "Logos, colour palette and usage guidelines." },
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
      title="One mark, one colour."
      description="The mark is a prompt chevron travelling inside an open orbit, with a satellite dot in the gap: a coding prompt running as an asynchronous loop."
    >
      <section className="mb-16">
        <h2 className="font-serif-display text-2xl mb-6">Logo assets</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {ASSETS.map((a) => (
            <div key={a.file} className="paper-card overflow-hidden">
              <div className={`${a.tone} h-48 flex items-center justify-center p-8`}>
                <img src={`/brand/${a.file}`} alt={a.title} className="max-h-20 w-auto" />
              </div>
              <div className="p-4 flex items-center justify-between gap-3">
                <div>
                  <div className="font-medium text-sm">{a.title}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{a.note}</div>
                </div>
                <a
                  href={`/brand/${a.file}`}
                  download={`async-coder-${a.file}`}
                  className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full bg-foreground text-background text-xs font-medium hover:opacity-90 transition-opacity"
                >
                  <Download className="w-3.5 h-3.5" /> SVG
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-16">
        <h2 className="font-serif-display text-2xl mb-6">Colour palette</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {PALETTE.map((c) => (
            <div key={c.hex} className="paper-card overflow-hidden">
              <div className="h-24 border-b border-border" style={{ background: c.hex }} />
              <div className="p-4">
                <div className="font-medium">{c.name}</div>
                <div className="font-mono text-xs text-muted-foreground mt-0.5">{c.hex}</div>
                <div className="text-xs text-muted-foreground mt-2">{c.role}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-serif-display text-2xl mb-4">Usage guidelines</h2>
        <ul className="space-y-3 text-muted-foreground">
          <li>
            <span className="text-foreground font-medium">Do:</span> keep clear space equal to the
            satellite dot around the mark, and use it at 16 px or larger.
          </li>
          <li>
            <span className="text-foreground font-medium">Do:</span> use lavender as the single
            accent colour on ink or paper.
          </li>
          <li>
            <span className="text-foreground font-medium">Don&apos;t:</span> rotate, outline or
            recolour the mark outside the palette.
          </li>
          <li>
            <span className="text-foreground font-medium">Don&apos;t:</span> imply endorsement by
            Xiaomi, MiMo, or the OpenCode team.
          </li>
        </ul>
      </section>
    </Page>
  );
}
