import { motion } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2, KeyRound, ShieldCheck, Zap } from "lucide-react";
import { SectionHead } from "./section-head";

const PROVIDERS = [
  { name: "Anthropic", model: "Claude 3.7 Sonnet", logo: "/provider-logos/anthropic.svg" },
  { name: "OpenAI", model: "GPT-4.5 / o3-mini", logo: "/provider-logos/openai.svg" },
  { name: "Google", model: "Gemini 2.5 Pro", logo: "/provider-logos/google.svg" },
  { name: "xAI", model: "Grok 3 & Grok 2", logo: "/provider-logos/xai.svg" },
  { name: "Groq", model: "Llama 3.3 70B @ 300 t/s", logo: "/provider-logos/groq.svg" },
  { name: "OpenRouter", model: "200+ models", logo: "/provider-logos/openrouter.svg" },
  { name: "GitHub Copilot", model: "Existing seat", logo: "/provider-logos/github-copilot.svg" },
] as const;

export function Models() {
  return (
    <section className="pb-24 md:pb-32 relative">
      <div className="mx-auto max-w-6xl px-5 md:px-8">
        <SectionHead
          eyebrow="Universal Provider Support"
          title="Any model."
          accent="Your keys, your bill."
          note="✦ no middleman fees · pay providers directly at API cost"
          align="center"
        >
          Connect the providers you already use. async-coder routes tasks by capability, falls back
          visibly when a model provider is degraded, and never stores or forwards your tokens
          through third-party servers.
        </SectionHead>

        {/* Meadow Artwork Canvas - Inspired by Singroup */}
        <motion.figure
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.8 }}
          className="art-frame relative mt-14 overflow-hidden rounded-[24px] md:rounded-[34px] border border-border/80 shadow-[0_30px_90px_-40px_rgba(40,110,60,0.45)]"
        >
          {/* Sunny Daisy Meadow Art */}
          <img
            src="/art/meadow.jpg"
            alt="A sunlit meadow of daisies and wildflowers under an open sky"
            className="w-full h-[460px] md:h-[560px] object-cover object-[50%_65%] transition-transform duration-1000 scale-[1.01] hover:scale-[1.02]"
            loading="lazy"
            width={1536}
            height={1024}
          />

          <div
            className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent pointer-events-none"
            aria-hidden
          />

          {/* Exhibition Top Banner */}
          <div className="absolute top-4 inset-x-6 flex items-center justify-between text-white/85 pointer-events-none text-xs">
            <span className="font-mono text-[10.5px] uppercase tracking-wider bg-black/40 backdrop-blur-md px-3 py-1 rounded-full border border-white/20">
              Zero Vendor Lock-In · BYOK Architecture
            </span>
            <span className="hidden sm:inline font-mono text-[10.5px] bg-black/40 backdrop-blur-md px-3 py-1 rounded-full border border-white/20">
              100% Local Token Counting
            </span>
          </div>

          {/* In-Meadow Floating Glass Provider Island */}
          <div className="absolute inset-x-0 bottom-0 p-4 md:p-8 flex justify-center">
            <div className="glass-card rounded-3xl p-4 md:p-6 w-full max-w-4xl shadow-2xl ring-1 ring-white/50 dark:ring-white/10">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-3 border-b border-foreground/10 text-xs">
                <span className="font-medium text-foreground text-[13px] flex items-center gap-1.5">
                  <KeyRound className="w-4 h-4 text-lavender-deep" />
                  Bring Your Own API Keys
                </span>
                <span className="text-muted-foreground text-[11.5px] font-mono mt-1 sm:mt-0">
                  Direct client-to-API requests · Zero proxy
                </span>
              </div>

              <ul className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {PROVIDERS.map((p) => (
                  <li
                    key={p.name}
                    className="flex items-center gap-2.5 rounded-2xl bg-white/70 dark:bg-white/10 border border-white/70 dark:border-white/10 px-3 py-2.5 backdrop-blur-md hover:bg-white/85 transition-colors group"
                  >
                    <img
                      src={p.logo}
                      alt=""
                      className="w-6 h-6 shrink-0 transition-transform duration-200 group-hover:scale-110"
                      width={24}
                      height={24}
                    />
                    <div className="min-w-0 flex-1 text-left">
                      <p className="text-[12.5px] font-semibold text-foreground truncate">
                        {p.name}
                      </p>
                      <p className="text-[10px] text-muted-foreground font-mono truncate">
                        {p.model}
                      </p>
                    </div>
                  </li>
                ))}
                <li className="flex items-center justify-center rounded-2xl bg-foreground text-background px-3 py-2.5 text-[12.5px] font-medium hover:opacity-90 active:scale-[0.98] transition-all shadow-xs">
                  <Link to="/providers" className="inline-flex items-center gap-1.5">
                    Explore all providers <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </motion.figure>
      </div>
    </section>
  );
}
