import { Command } from "cmdk";
import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Book, FileText, Github, Globe, Home, Layers, Package, Users, Sparkles, Star, Shield } from "lucide-react";
import { SITE } from "@/lib/site";

const ITEMS = [
  { group: "Pages", icon: Home, label: "Home", to: "/" },
  { group: "Pages", icon: Sparkles, label: "Features", to: "/features" },
  { group: "Pages", icon: Layers, label: "Providers", to: "/providers" },
  { group: "Pages", icon: Package, label: "Pricing", to: "/pricing" },
  { group: "Pages", icon: Shield, label: "Enterprise self-hosting", to: "/enterprise" },
  { group: "Pages", icon: Book, label: "Docs", to: "/docs" },
  { group: "Pages", icon: FileText, label: "Changelog", to: "/changelog" },
  { group: "Pages", icon: Users, label: "Contributors", to: "/contributors" },
  { group: "Pages", icon: Star, label: "Star gazers", to: "/star-gazers" },
  { group: "Pages", icon: Globe, label: "Community", to: "/community" },
  { group: "Pages", icon: Sparkles, label: "Brand", to: "/brand" },
  { group: "Docs", icon: Book, label: "Introduction", to: "/docs" },
  { group: "Docs", icon: Book, label: "Quickstart", to: "/docs/quickstart" },
  { group: "Docs", icon: Book, label: "Configuration", to: "/docs/configuration" },
  { group: "Docs", icon: Book, label: "Agents", to: "/docs/agents" },
  { group: "Docs", icon: Book, label: "Slash commands", to: "/docs/commands" },
  { group: "Docs", icon: Book, label: "Plugins", to: "/docs/plugins" },
  { group: "Docs", icon: Book, label: "MCP", to: "/docs/mcp" },
  { group: "Docs", icon: Book, label: "Providers", to: "/docs/providers" },
  { group: "Docs", icon: Book, label: "Web search", to: "/docs/websearch" },
  { group: "Docs", icon: Book, label: "Usage dashboard", to: "/docs/usage" },
  { group: "Docs", icon: Book, label: "Persistent memory", to: "/docs/memory" },
  { group: "Docs", icon: Book, label: "Subagents", to: "/docs/subagents" },
  { group: "Docs", icon: Book, label: "Compose", to: "/docs/compose" },
  { group: "Docs", icon: Book, label: "Dream & Distill", to: "/docs/dream-distill" },
  { group: "Docs", icon: Book, label: "Self-hosting", to: "/docs/self-hosting" },
  { group: "Docs", icon: Book, label: "SDK / API", to: "/docs/api" },
  { group: "Docs", icon: Book, label: "FAQ", to: "/docs/faq" },
  { group: "Docs", icon: Book, label: "Migration from MiMo-Code", to: "/docs/migration" },
  { group: "Providers", icon: Layers, label: "Groq", to: "/docs/providers/groq" },
  { group: "Providers", icon: Layers, label: "OpenRouter", to: "/docs/providers/openrouter" },
  { group: "Providers", icon: Layers, label: "OpenAI", to: "/docs/providers/openai" },
  { group: "Providers", icon: Layers, label: "Anthropic", to: "/docs/providers/anthropic" },
  { group: "Providers", icon: Layers, label: "Google", to: "/docs/providers/google" },
  { group: "Providers", icon: Layers, label: "xAI", to: "/docs/providers/xai" },
  { group: "Providers", icon: Layers, label: "GitHub Copilot", to: "/docs/providers/copilot" },
  { group: "Providers", icon: Layers, label: "Custom / self-hosted", to: "/docs/providers/custom" },
] as const;

export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[12vh] px-4 bg-background/70 backdrop-blur-sm animate-float-up"
      onClick={() => onOpenChange(false)}
    >
      <Command
        className="w-full max-w-xl rounded-xl border border-lavender/30 bg-elevated shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        loop
      >
        <div className="border-b border-border/60 px-4">
          <Command.Input
            autoFocus
            placeholder="Search docs, pages, commands…"
            className="w-full h-12 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
          />
        </div>
        <Command.List className="max-h-[60vh] overflow-y-auto p-2">
          <Command.Empty className="px-3 py-8 text-center text-sm text-muted-foreground">
            No matches.
          </Command.Empty>

          {Array.from(new Set(ITEMS.map((i) => i.group))).map((g) => (
            <Command.Group
              key={g}
              heading={g}
              className="px-2 py-1.5 text-[10px] font-medium tracking-widest uppercase text-muted-foreground"
            >
              {ITEMS.filter((i) => i.group === g).map((item) => (
                <Command.Item
                  key={item.to}
                  value={`${item.group} ${item.label}`}
                  onSelect={() => {
                    onOpenChange(false);
                    navigate({ to: item.to });
                  }}
                  className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-foreground cursor-pointer data-[selected=true]:bg-lavender/15 data-[selected=true]:text-lavender"
                >
                  <item.icon className="w-4 h-4 opacity-70" />
                  <span>{item.label}</span>
                </Command.Item>
              ))}
            </Command.Group>
          ))}

          <Command.Group
            heading="External"
            className="px-2 py-1.5 text-[10px] font-medium tracking-widest uppercase text-muted-foreground"
          >
            <Command.Item
              value="github repository"
              onSelect={() => window.open(SITE.repoUrl, "_blank")}
              className="flex items-center gap-3 px-3 py-2 rounded-md text-sm cursor-pointer data-[selected=true]:bg-lavender/15"
            >
              <Github className="w-4 h-4 opacity-70" />
              Open GitHub repo
            </Command.Item>
          </Command.Group>
        </Command.List>
      </Command>
    </div>
  );
}
