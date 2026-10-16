import { Check, Copy, Github, Sparkles } from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { SITE } from "@/lib/site";

export function FinalCTA() {
  const [copied, setCopied] = useState(false);
  return (
    <section className="pb-12 md:pb-20 relative">
      <div className="mx-auto max-w-6xl px-3 md:px-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.8 }}
          className="art-frame relative overflow-hidden rounded-[24px] md:rounded-[36px] border border-border/80 shadow-[0_30px_90px_-40px_rgba(30,40,110,0.5)]"
        >
          <img
            src="/art/garden-pixel.jpg"
            alt="A pixel-art classical garden with a marble statue, cypress trees and a view of the sea"
            className="w-full h-[540px] md:h-[620px] object-cover object-[50%_40%] transition-transform duration-1000 scale-[1.01] hover:scale-[1.02]"
            loading="lazy"
            width={1536}
            height={1024}
          />
          <div
            className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/10 pointer-events-none"
            aria-hidden
          />

          <div className="absolute top-5 inset-x-6 md:inset-x-10 flex items-center justify-between text-white/80 pointer-events-none text-xs">
            <span className="font-mono text-[11px] uppercase tracking-wider bg-black/40 backdrop-blur-md px-3 py-1 rounded-full border border-white/20">
              async-coder · Autonomous Software Craft
            </span>
            <span className="font-handwriting text-amber-200 text-lg hidden sm:inline drop-shadow-sm">
              start shipping in minutes
            </span>
          </div>

          <div className="absolute inset-x-0 bottom-0 p-6 md:p-12 text-white">
            <h2 className="font-serif-display text-[clamp(2.4rem,5.4vw,4.6rem)] max-w-3xl leading-[1.04] [text-shadow:0_2px_24px_rgba(0,0,0,0.65)]">
              Hand it off.{" "}
              <em className="italic font-normal text-lavender-soft">Come back to a diff.</em>
            </h2>
            <p className="mt-4 max-w-xl text-white/90 text-[16px] md:text-[17.5px] leading-relaxed font-normal">
              100% free, MIT licensed, and bring-your-own-key. Install it in one line, point it at a
              bug or spec, and let it work while you step away.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row sm:items-center gap-3">
              <button
                onClick={() => {
                  void navigator.clipboard.writeText(SITE.install);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1600);
                }}
                className="inline-flex items-center gap-3 h-12 pl-5 pr-3 rounded-full bg-white text-[#14102B] font-mono text-[13px] hover:bg-white/95 active:scale-[0.99] transition-all shadow-lg"
                aria-label="Copy install command"
              >
                <span className="opacity-50 text-lavender-deep">$</span>
                <span className="font-medium">{SITE.install}</span>
                <span className="grid place-items-center w-7 h-7 rounded-full bg-black/10">
                  {copied ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </span>
              </button>
              <Link
                to="/docs/quickstart"
                className="inline-flex items-center justify-center h-12 px-6 rounded-full border border-white/60 bg-white/10 backdrop-blur-md text-sm font-medium hover:bg-white/20 active:scale-[0.99] transition-all"
              >
                Quickstart Guide →
              </Link>
              <a
                href={SITE.repoUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 h-12 px-4 text-sm font-medium text-white/85 hover:text-white transition-colors"
              >
                <Github className="w-4 h-4" /> GitHub
              </a>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
