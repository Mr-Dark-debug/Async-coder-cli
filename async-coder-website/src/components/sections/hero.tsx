import { motion } from "framer-motion";
import { ArrowRight, Check, Copy, Play } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { SITE } from "@/lib/site";
import { Link } from "@tanstack/react-router";

const PROVIDERS = ["Groq", "OpenRouter", "OpenAI", "Anthropic", "Google", "xAI", "Copilot"];

function Starfield() {
  const stars = Array.from({ length: 60 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    s: Math.random() * 1.5 + 0.5,
    d: Math.random() * 4 + 2,
    delay: Math.random() * 4,
  }));
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      {stars.map((s) => (
        <span
          key={s.id}
          className="absolute rounded-full bg-foreground/50"
          style={{
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: s.s,
            height: s.s,
            animation: `star-twinkle ${s.d}s ease-in-out ${s.delay}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

function TerminalMock() {
  const ref = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!ref.current) return;
      const r = ref.current.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      setTilt({ x: (e.clientY - cy) / 80, y: -(e.clientX - cx) / 80 });
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  return (
    <div
      ref={ref}
      className="relative mx-auto max-w-5xl"
      style={{
        transform: `perspective(1600px) rotateX(${Math.max(-4, Math.min(4, tilt.x))}deg) rotateY(${Math.max(-4, Math.min(4, tilt.y))}deg)`,
        transformStyle: "preserve-3d",
        transition: "transform 0.25s ease-out",
      }}
    >
      <div className="absolute -inset-12 bg-lavender/20 blur-[100px] rounded-full" aria-hidden />
      <div className="relative rounded-xl border border-lavender/25 bg-elevated/90 backdrop-blur shadow-2xl overflow-hidden">
        {/* window chrome */}
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border/60 bg-background/60">
          <span className="w-2.5 h-2.5 rounded-full bg-error/70" />
          <span className="w-2.5 h-2.5 rounded-full bg-warning/70" />
          <span className="w-2.5 h-2.5 rounded-full bg-success/70" />
          <span className="ml-3 font-mono text-[11px] text-muted-foreground">~ async-coder</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] font-mono text-[12px] leading-relaxed">
          {/* sidebar */}
          <aside className="hidden md:flex flex-col gap-4 p-4 border-r border-border/60 bg-background/40">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">
                Usage
              </div>
              <div className="text-lavender font-semibold">$0.042</div>
              <div className="text-[11px] text-muted-foreground mt-1">
                in 1.2k · out 340 · cr 8.1k
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">
                Context
              </div>
              <div className="text-foreground">12.4k / 32k</div>
              <div className="mt-1.5 h-1.5 w-full rounded-full bg-border/60 overflow-hidden">
                <div className="h-full w-[38%] bg-lavender rounded-full" />
              </div>
              <div className="text-[11px] text-muted-foreground mt-1">38% used</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">
                Tasks
              </div>
              <ul className="space-y-1.5 text-[11px]">
                <li className="text-success">✓ Add Zod schema</li>
                <li className="text-lavender animate-pulse">▸ Wire API route</li>
                <li className="text-muted-foreground">○ Write tests</li>
              </ul>
            </div>
          </aside>

          {/* main */}
          <div className="p-4 min-h-[320px]">
            <pre className="text-lavender leading-[1.05] text-[8px] sm:text-[9px] md:text-[10px] mb-4 font-mono select-none drop-shadow-[0_0_12px_rgba(177,151,252,0.35)] whitespace-pre overflow-x-auto">{` █████╗ ███████╗██╗   ██╗███╗   ██╗ ██████╗
██╔══██╗██╔════╝╚██╗ ██╔╝████╗  ██║██╔════╝
███████║███████╗ ╚████╔╝ ██╔██╗ ██║██║     
██╔══██║╚════██║  ╚██╔╝  ██║╚██╗██║██║     
██║  ██║███████║   ██║   ██║ ╚████║╚██████╗
╚═╝  ╚═╝╚══════╝   ╚═╝   ╚═╝  ╚═══╝ ╚═════╝
 ██████╗ ██████╗ ██████╗ ███████╗██████╗ 
██╔════╝██╔═══██╗██╔══██╗██╔════╝██╔══██╗
██║     ██║   ██║██║  ██║█████╗  ██████╔╝
██║     ██║   ██║██║  ██║██╔══╝  ██╔══██╗
╚██████╗╚██████╔╝██████╔╝███████╗██║  ██║
 ╚═════╝ ╚═════╝ ╚═════╝ ╚══════╝╚═╝  ╚═╝`}</pre>
            <div className="text-muted-foreground mb-3">
              <span className="text-lavender">›</span> refactor src/api.ts to use Zod
            </div>
            <div className="space-y-1.5 text-foreground/90">
              <div className="text-accent-blue">// applying diff to src/api.ts</div>
              <div>
                <span className="text-error">- export function getUser(id) {`{`}</span>
              </div>
              <div>
                <span className="text-success">+ export const UserSchema = z.object({`{`}</span>
              </div>
              <div>
                <span className="text-success">+ &nbsp;&nbsp;id: z.string().uuid(),</span>
              </div>
              <div>
                <span className="text-success">+ &nbsp;&nbsp;name: z.string().min(1),</span>
              </div>
              <div>
                <span className="text-success">+ {`});`}</span>
              </div>
              <div className="text-muted-foreground">  applied · 1 file changed · +4 -1</div>
            </div>
            <div className="mt-4 pt-3 border-t border-border/60 flex items-center gap-2">
              <span className="text-lavender">›</span>
              <span className="text-foreground/90">add tests for the schema</span>
              <span className="inline-block w-1.5 h-3.5 bg-lavender animate-blink" />
            </div>
          </div>
        </div>

        {/* status */}
        <div className="px-4 py-2 border-t border-border/60 bg-background/60 flex items-center justify-between font-mono text-[10px] text-muted-foreground">
          <span>
            <span className="text-lavender">groq</span>/llama-3.3-70b-versatile · 42 tps · $0.0012/msg
          </span>
          <span>tab · /help · ⌘K</span>
        </div>
      </div>
    </div>
  );
}

export function Hero() {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(SITE.install).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <section className="relative pt-20 md:pt-28 pb-16 md:pb-24 overflow-hidden">
      <div className="absolute inset-0 hero-grid-bg" aria-hidden />
      <div className="absolute inset-0 dot-grid opacity-30" aria-hidden />
      <Starfield />
      <div
        className="absolute left-1/2 top-0 -translate-x-1/2 w-[800px] h-[800px] bg-lavender/30 rounded-full blur-[140px] animate-pulse-glow pointer-events-none"
        aria-hidden
      />

      <div className="relative mx-auto max-w-7xl px-4 md:px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-lavender/30 bg-lavender/5 text-[11px] font-mono text-lavender"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-lavender animate-pulse" />
          {SITE.version} · MIT · Bun-powered
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.05 }}
          className="mt-6 font-display font-semibold tracking-[-0.04em] text-4xl sm:text-5xl md:text-6xl lg:text-7xl leading-[1.02] text-foreground max-w-4xl mx-auto"
        >
          The <span className="text-gradient-lavender">async</span> coding agent
          <br className="hidden sm:block" /> for every model.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.12 }}
          className="mt-6 text-base md:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed"
        >
          Bring your own API key. Groq, OpenRouter, OpenAI, Anthropic, Google, xAI, Copilot — or any
          OpenAI-compatible endpoint. No telemetry, no platform lock-in, no required login.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3"
        >
          <div className="group flex items-center gap-3 h-12 pl-5 pr-2 rounded-lg bg-lavender text-primary-foreground glow-lavender font-mono text-sm">
            <span className="text-primary-foreground/50">$</span>
            <span className="font-medium">{SITE.install}</span>
            <button
              onClick={copy}
              aria-label="Copy install command"
              className="ml-2 inline-flex items-center justify-center w-8 h-8 rounded-md bg-primary-foreground/10 hover:bg-primary-foreground/20 transition-colors"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>

          <Link
            to="/docs"
            className="inline-flex items-center gap-2 h-12 px-5 rounded-lg border border-lavender/40 text-foreground hover:bg-lavender/10 hover:border-lavender transition-colors text-sm font-medium"
          >
            Read the docs
            <ArrowRight className="w-4 h-4" />
          </Link>

          <a
            href="#demo"
            className="inline-flex items-center gap-2 h-12 px-4 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            Watch 90s demo
          </a>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-mono text-muted-foreground"
        >
          <span className="text-[10px] uppercase tracking-widest">Works with</span>
          {PROVIDERS.map((p, i) => (
            <span key={p} className="flex items-center gap-2">
              <span className="hover:text-lavender transition-colors cursor-default">{p}</span>
              {i < PROVIDERS.length - 1 && <span className="text-border">·</span>}
            </span>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="mt-16"
        >
          <TerminalMock />
        </motion.div>
      </div>
    </section>
  );
}
