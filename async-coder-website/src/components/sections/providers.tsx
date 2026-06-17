import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

export const PROVIDERS = [
  {
    name: "Groq",
    tag: "Recommended",
    blurb: "Fastest inference on the planet. Free tier, instant onboarding.",
    env: "GROQ_API_KEY=gsk_…",
    link: "https://console.groq.com/keys",
    color: "rgba(245, 80, 54, 0.15)",
  },
  {
    name: "OpenRouter",
    tag: "Recommended",
    blurb: "One key, 200+ models. Pay-as-you-go, no markup beyond pennies.",
    env: "OPENROUTER_API_KEY=sk-or-…",
    link: "https://openrouter.ai/keys",
    color: "rgba(0, 114, 245, 0.15)",
  },
  {
    name: "OpenAI",
    blurb: "GPT-5, GPT-4.1, o-series. The industry standard.",
    env: "OPENAI_API_KEY=sk-…",
    link: "https://platform.openai.com/api-keys",
    color: "rgba(16, 163, 127, 0.15)",
  },
  {
    name: "Anthropic",
    blurb: "Claude 4.5 Sonnet and Opus. Long context, careful reasoning.",
    env: "ANTHROPIC_API_KEY=sk-ant-…",
    link: "https://console.anthropic.com/settings/keys",
    color: "rgba(204, 138, 0, 0.15)",
  },
  {
    name: "Google",
    blurb: "Gemini 2.5 Pro/Flash. Massive context, multimodal.",
    env: "GOOGLE_API_KEY=AI…",
    link: "https://aistudio.google.com/apikey",
    color: "rgba(66, 133, 244, 0.15)",
  },
  {
    name: "xAI",
    blurb: "Grok 4 and beyond. Fast, irreverent, real-time-aware.",
    env: "XAI_API_KEY=xai-…",
    link: "https://console.x.ai",
    color: "rgba(255, 255, 255, 0.1)",
  },
  {
    name: "GitHub Copilot",
    blurb: "Reuse your Copilot subscription via the chat endpoint.",
    env: "COPILOT_TOKEN=…",
    link: "https://github.com/settings/copilot",
    color: "rgba(110, 64, 201, 0.15)",
  },
  {
    name: "Custom",
    blurb: "Any OpenAI-compatible endpoint in 4 fields. Ollama, vLLM, LM Studio, etc.",
    env: "BASE_URL=http://localhost:11434/v1",
    link: "/docs/providers/custom",
    color: "rgba(177, 151, 252, 0.15)",
  },
];

export function ProviderShowcase() {
  return (
    <section id="providers" className="py-24 md:py-32 relative">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-lavender/40 to-transparent" />
      <div className="absolute inset-0 -z-10">
        <div className="absolute left-0 top-1/4 w-[400px] h-[400px] bg-lavender/10 rounded-full blur-[120px]" />
        <div className="absolute right-0 bottom-1/4 w-[400px] h-[400px] bg-accent-blue/10 rounded-full blur-[120px]" />
      </div>

      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <div className="max-w-2xl">
          <div className="text-xs font-mono uppercase tracking-widest text-lavender mb-3">
            Providers
          </div>
          <h2 className="font-display text-3xl md:text-5xl font-semibold tracking-tight">
            One agent. Every provider.
          </h2>
          <p className="mt-4 text-muted-foreground text-base md:text-lg leading-relaxed">
            Switch providers without switching tools. Add an API key once; models auto-load.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {PROVIDERS.map((p, i) => {
            const logoSlug = p.name.toLowerCase().replace(" ", "-");
            return (
              <motion.a
                key={p.name}
                href={p.link}
                target={p.link.startsWith("/") ? undefined : "_blank"}
                rel="noreferrer"
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.35, delay: (i % 4) * 0.04 }}
                className="group relative rounded-xl border border-border/60 bg-panel/70 p-5 hover:border-lavender/50 hover:-translate-y-1 transition-all overflow-hidden"
                style={{
                  // Custom hover glow color on each card
                  "--hover-glow": p.color,
                } as any}
              >
                {p.tag && (
                  <span className="absolute top-3 right-3 text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-lavender text-primary-foreground font-semibold">
                    {p.tag}
                  </span>
                )}
                
                {/* Glow behind the logo */}
                <div 
                  className="absolute -left-4 -top-4 w-16 h-16 rounded-full opacity-0 group-hover:opacity-100 transition-opacity blur-xl"
                  style={{ backgroundColor: p.color }}
                />

                <div className="relative inline-flex items-center justify-center w-10 h-10 rounded-lg bg-elevated border border-border/80 mb-4 group-hover:scale-110 transition-transform">
                  <img
                    src={`/provider-logos/${logoSlug}.svg`}
                    alt={p.name}
                    className="w-5 h-5 object-contain"
                  />
                </div>
                <h3 className="font-display font-semibold text-foreground">{p.name}</h3>
                <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed min-h-[3rem]">
                  {p.blurb}
                </p>
                <div className="mt-3 font-mono text-[11px] text-foreground/80 bg-background/60 rounded px-2 py-1.5 truncate border border-border/40">
                  {p.env}
                </div>
                <div className="mt-3 inline-flex items-center gap-1 text-xs text-lavender opacity-70 group-hover:opacity-100">
                  Get a key <ArrowRight className="w-3 h-3" />
                </div>
              </motion.a>
            );
          })}
        </div>

        <div className="mt-10 rounded-xl border border-lavender/30 bg-lavender/5 p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h4 className="font-display font-semibold text-foreground">Don't see your provider?</h4>
            <p className="text-sm text-muted-foreground mt-1">
              Add any OpenAI-compatible endpoint in 4 fields.
            </p>
          </div>
          <a
            href="/docs/providers"
            className="inline-flex items-center gap-2 px-4 h-10 rounded-md bg-lavender text-primary-foreground text-sm font-medium hover:bg-lavender-soft transition-colors animate-pulse-glow"
          >
            Add a custom provider <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </div>
    </section>
  );
}
