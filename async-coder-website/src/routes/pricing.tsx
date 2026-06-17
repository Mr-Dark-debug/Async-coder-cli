import { createFileRoute } from "@tanstack/react-router";
import { Page } from "@/components/page";
import { Check, ExternalLink, KeyRound, Zap, ShieldCheck } from "lucide-react";

type Row = {
  name: string;
  models: string;
  input: string;
  output: string;
  free: string;
  signup: string;
  envVar: string;
};

const PRICING: Row[] = [
  {
    name: "Groq",
    models: "llama-3.3-70b-versatile, llama-3.1-8b-instant, deepseek-r1-distill-llama-70b",
    input: "$0.59 / 1M",
    output: "$0.79 / 1M",
    free: "Generous free tier (~14k req/day on 70B)",
    signup: "https://console.groq.com/keys",
    envVar: "GROQ_API_KEY",
  },
  {
    name: "OpenRouter",
    models: "Any model on openrouter.ai (Claude, GPT, Gemini, Llama, Qwen…)",
    input: "Provider price",
    output: "Provider price + ~5% router fee",
    free: "Some :free models, otherwise pay-as-you-go",
    signup: "https://openrouter.ai/settings/keys",
    envVar: "OPENROUTER_API_KEY",
  },
  {
    name: "OpenAI",
    models: "gpt-5, gpt-5-mini, gpt-4.1, o4-mini",
    input: "GPT-5: $1.25 / 1M",
    output: "GPT-5: $10.00 / 1M",
    free: "$5 sign-up credit (new accounts)",
    signup: "https://platform.openai.com/api-keys",
    envVar: "OPENAI_API_KEY",
  },
  {
    name: "Anthropic",
    models: "claude-sonnet-4.5, claude-opus-4.1, claude-haiku-4.5",
    input: "Sonnet 4.5: $3.00 / 1M",
    output: "Sonnet 4.5: $15.00 / 1M",
    free: "$5 trial credit",
    signup: "https://console.anthropic.com/settings/keys",
    envVar: "ANTHROPIC_API_KEY",
  },
  {
    name: "Google",
    models: "gemini-2.5-pro, gemini-2.5-flash, gemini-2.5-flash-lite",
    input: "2.5 Pro: $1.25 / 1M (≤200k)",
    output: "2.5 Pro: $10.00 / 1M",
    free: "Free tier on Flash (rate-limited)",
    signup: "https://aistudio.google.com/apikey",
    envVar: "GOOGLE_API_KEY",
  },
  {
    name: "xAI",
    models: "grok-4, grok-code-fast-1, grok-3, grok-3-mini",
    input: "Grok 4: $3.00 / 1M",
    output: "Grok 4: $15.00 / 1M",
    free: "$150/mo credits with data-sharing program",
    signup: "https://console.x.ai",
    envVar: "XAI_API_KEY",
  },
  {
    name: "GitHub Copilot",
    models: "Copilot models via your active subscription",
    input: "Flat subscription",
    output: "Flat subscription",
    free: "Free for verified students/teachers/OSS maintainers",
    signup: "https://github.com/settings/copilot",
    envVar: "GITHUB_TOKEN",
  },
  {
    name: "Custom / self-hosted",
    models: "Any OpenAI-compatible endpoint (Ollama, vLLM, LM Studio, LiteLLM)",
    input: "$0 self-hosted",
    output: "$0 self-hosted",
    free: "Yes — run locally",
    signup: "https://github.com/Mr-Dark-debug/Async-coder-cli#custom-provider",
    envVar: "CUSTOM_BASE_URL + CUSTOM_API_KEY",
  },
];

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — async-coder" },
      {
        name: "description",
        content:
          "async-coder is MIT-licensed and $0 forever. Bring your own provider key — we don't take a cut. Live reference prices for Groq, OpenRouter, OpenAI, Anthropic, Google, xAI, and Copilot.",
      },
      { property: "og:title", content: "Pricing — async-coder" },
      { property: "og:url", content: "/pricing" },
    ],
    links: [{ rel: "canonical", href: "/pricing" }],
  }),
  component: PricingPage,
});

function PricingPage() {
  return (
    <Page
      eyebrow="Pricing"
      title="Free forever. Bring your own key."
      description="async-coder is MIT-licensed open source. We don't charge anything, ever. You pay your provider directly — at their price, with no markup, no proxy, no analytics."
    >
      {/* Three pillars */}
      <div className="grid md:grid-cols-3 gap-4 mb-12">
        {[
          { icon: Zap, title: "$0 to install", body: "npm i -g async-coder. No account. No login. No credit card." },
          { icon: KeyRound, title: "Your key, your cost", body: "We don't proxy. Requests go directly from your terminal to the provider." },
          { icon: ShieldCheck, title: "No telemetry", body: "Zero phone-home. Audit it yourself — the source is on GitHub." },
        ].map(({ icon: Icon, title, body }) => (
          <div key={title} className="rounded-xl border border-border/60 bg-elevated/40 p-5">
            <div className="w-9 h-9 rounded-md bg-lavender/15 border border-lavender/30 inline-flex items-center justify-center text-lavender mb-3">
              <Icon className="w-4 h-4" />
            </div>
            <div className="font-display font-semibold">{title}</div>
            <p className="text-sm text-muted-foreground mt-1">{body}</p>
          </div>
        ))}
      </div>

      {/* BYOK callout */}
      <div className="rounded-2xl border border-lavender/30 bg-lavender/5 p-6 mb-10">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-lavender/15 border border-lavender/30 inline-flex items-center justify-center text-lavender shrink-0">
            <Check className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-semibold text-lg">What "bring your own key" means</h3>
            <p className="text-muted-foreground text-sm mt-1 max-w-3xl">
              You set an environment variable (e.g. <code className="font-mono text-lavender">GROQ_API_KEY</code>) or
              run <code className="font-mono text-lavender">async-coder auth login</code>. The CLI calls the provider's
              API directly using your key. Nothing transits our servers — we don't have servers.
              Switch providers any time with <code className="font-mono text-lavender">/model</code>.
            </p>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border/60">
        <table className="w-full text-sm min-w-[820px]">
          <thead className="bg-panel/60">
            <tr className="text-left">
              <th className="font-medium px-5 py-3 text-foreground">Provider</th>
              <th className="font-medium px-5 py-3 text-foreground">Models</th>
              <th className="font-medium px-5 py-3 text-foreground">Input</th>
              <th className="font-medium px-5 py-3 text-foreground">Output</th>
              <th className="font-medium px-5 py-3 text-foreground">Free tier</th>
              <th className="font-medium px-5 py-3 text-foreground">Env var</th>
              <th className="font-medium px-5 py-3 text-foreground" />
            </tr>
          </thead>
          <tbody>
            {PRICING.map((p, i) => (
              <tr key={p.name} className={i % 2 ? "bg-panel/30" : ""}>
                <td className="px-5 py-3.5 font-medium text-foreground align-top">{p.name}</td>
                <td className="px-5 py-3.5 text-muted-foreground text-xs align-top">{p.models}</td>
                <td className="px-5 py-3.5 text-foreground font-mono text-xs align-top">{p.input}</td>
                <td className="px-5 py-3.5 text-foreground font-mono text-xs align-top">{p.output}</td>
                <td className="px-5 py-3.5 text-muted-foreground text-xs align-top">{p.free}</td>
                <td className="px-5 py-3.5 font-mono text-xs text-lavender align-top">{p.envVar}</td>
                <td className="px-5 py-3.5 align-top">
                  <a
                    href={p.signup}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-lavender hover:underline"
                  >
                    Get key <ExternalLink className="w-3 h-3" />
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-6 text-xs text-muted-foreground max-w-3xl">
        Prices last verified June 2026 and are reference values per 1M tokens unless noted. Providers update
        pricing without notice — always confirm on the provider's own pricing page before estimating budget.
        OpenRouter passes through the underlying provider price and adds a small router fee disclosed at request time.
      </p>
    </Page>
  );
}
