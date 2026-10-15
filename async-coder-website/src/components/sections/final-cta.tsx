import { Check, Copy, Github } from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { SITE } from "@/lib/site";

export function FinalCTA() {
  const [copied, setCopied] = useState(false);
  return (
    <section className="pb-10 md:pb-16">
      <div className="mx-auto max-w-6xl px-3 md:px-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.8 }}
          className="relative overflow-hidden rounded-[22px] md:rounded-[34px] border border-border shadow-[0_30px_80px_-40px_rgba(40,60,120,0.5)]"
        >
          <img
            src="/art/garden-pixel.jpg"
            alt="A pixel-art garden with a marble statue, cypress trees and a view of the sea"
            className="w-full h-[560px] md:h-[640px] object-cover object-[50%_40%]"
            style={{ imageRendering: "auto" }}
            loading="lazy"
            width={1536}
            height={1024}
          />
          <div
            className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent"
            aria-hidden
          />
          <div className="absolute inset-x-0 bottom-0 p-6 md:p-12 text-white">
            <h2 className="font-serif-display text-[clamp(2.2rem,5.2vw,4.4rem)] max-w-3xl [text-shadow:0_2px_24px_rgba(0,0,0,0.55)]">
              Hand it off. <em className="italic">Come back to a diff.</em>
            </h2>
            <p className="mt-4 max-w-xl text-white/85 text-[16px]">
              Free, MIT licensed, and bring-your-own-key. Install it in a minute and give it
              something tedious.
            </p>
            <div className="mt-7 flex flex-col sm:flex-row sm:items-center gap-3">
              <button
                onClick={() => {
                  void navigator.clipboard.writeText(SITE.install);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }}
                className="inline-flex items-center gap-3 h-12 pl-5 pr-3 rounded-full bg-white text-[#14102B] font-mono text-[13px] hover:bg-white/90 transition-colors"
                aria-label="Copy install command"
              >
                <span className="opacity-50">$</span>
                <span>{SITE.install}</span>
                <span className="grid place-items-center w-7 h-7 rounded-full bg-black/10">
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                </span>
              </button>
              <Link
                to="/docs/quickstart"
                className="inline-flex items-center h-12 px-5 rounded-full border border-white/60 text-sm font-medium hover:bg-white/10 transition-colors"
              >
                Quickstart
              </Link>
              <a
                href={SITE.repoUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 h-12 px-3 text-sm text-white/85 hover:text-white transition-colors"
              >
                <Github className="w-4 h-4" /> Star on GitHub
              </a>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
