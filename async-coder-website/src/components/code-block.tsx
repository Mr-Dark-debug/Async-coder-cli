import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function CopyButton({ value, className }: { value: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(value).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
      }}
      aria-label="Copy"
      className={cn(
        "inline-flex items-center justify-center w-7 h-7 rounded-md border border-border/60 hover:border-lavender/50 hover:text-lavender text-muted-foreground transition-colors",
        className,
      )}
    >
      {copied ? <Check className="w-3.5 h-3.5 text-lavender" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

export function CodeBlock({
  code,
  lang = "bash",
  filename,
  className,
}: {
  code: string;
  lang?: string;
  filename?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "group rounded-lg border border-border/60 bg-elevated/60 overflow-hidden font-mono text-[13px]",
        className,
      )}
    >
      {(filename || lang) && (
        <div className="flex items-center justify-between px-4 py-2 border-b border-border/60 text-xs text-muted-foreground">
          <span className="font-mono">{filename ?? lang}</span>
          <CopyButton value={code} />
        </div>
      )}
      <pre className="px-4 py-4 overflow-x-auto leading-relaxed text-foreground/90 whitespace-pre">
        {code}
      </pre>
    </div>
  );
}
