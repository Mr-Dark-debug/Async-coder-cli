import { motion } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { SectionHead } from "./section-head";

const PROVIDERS = [
  { name: "Anthropic", logo: "/provider-logos/anthropic.svg" },
  { name: "OpenAI", logo: "/provider-logos/openai.svg" },
  { name: "Google", logo: "/provider-logos/google.svg" },
  { name: "xAI", logo: "/provider-logos/xai.svg" },
  { name: "Groq", logo: "/provider-logos/groq.svg" },
  { name: "OpenRouter", logo: "/provider-logos/openrouter.svg" },
  { name: "GitHub Copilot", logo: "/provider-logos/github-copilot.svg" },
] as const;

export function Models() {
  return (
    <section className="pb-24 md:pb-32">
      <div className="mx-auto max-w-6xl px-5 md:px-8">
        <SectionHead
          eyebrow="Bring your own models"
          title="Any model."
          accent="Your keys, your bill."
          align="center"
        >
          Connect the providers you already use. async-coder routes by capability, falls back
          visibly when a model is down, and never sends your code anywhere you did not point it.
        </SectionHead>

        <motion.figure
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.8 }}
          className="relative mt-14 overflow-hidden rounded-[22px] md:rounded-[32px] border border-border shadow-[0_30px_80px_-40px_rgba(40,110,60,0.45)]"
        >
          <img
            src="/art/meadow.jpg"
            alt="A sunlit meadow of daisies and poppies under a bright sky"
            className="w-full h-[420px] md:h-[540px] object-cover object-[50%_65%]"
            loading="lazy"
            width={1536}
            height={1024}
          />
          <div className="absolute inset-x-0 bottom-0 p-4 md:p-8 flex justify-center">
            <div className="glass-card rounded-3xl px-4 py-4 md:px-6 md:py-5 w-full max-w-3xl">
              <ul className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {PROVIDERS.map((p) => (
                  <li
                    key={p.name}
                    className="flex items-center gap-2.5 rounded-2xl bg-white/60 dark:bg-white/10 border border-white/70 dark:border-white/10 px-3 py-2.5"
                  >
                    <img src={p.logo} alt="" className="w-6 h-6 shrink-0" width={24} height={24} />
                    <span className="text-[12.5px] truncate">{p.name}</span>
                  </li>
                ))}
                <li className="flex items-center justify-center rounded-2xl bg-foreground text-background px-3 py-2.5 text-[12.5px]">
                  <Link to="/providers" className="inline-flex items-center gap-1.5">
                    All providers <ArrowRight className="w-3.5 h-3.5" />
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
