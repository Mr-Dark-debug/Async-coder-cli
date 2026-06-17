import { createFileRoute } from "@tanstack/react-router";
import { DocsLayout, H2, P, InlineCode } from "@/components/docs-layout";

const CMDS: [string, string][] = [
  ["/help", "List every slash command."],
  ["/model", "Switch model. Tab to autocomplete."],
  ["/agent", "Switch agent profile."],
  ["/cost", "Open the usage dashboard for this session."],
  ["/search <q>", "Run the active web-search backend."],
  ["/memory", "View, add, or pin persistent memories."],
  ["/compose <fileA> <fileB>", "Open compose-edit on multiple files."],
  ["/dream", "Brainstorm without touching files."],
  ["/distill", "Compress this conversation into a memory."],
  ["/run <cmd>", "Run a shell command in the project."],
  ["/diff", "Show pending diffs."],
  ["/undo", "Revert the last applied diff."],
  ["/init", "Create async-coder.json in this repo."],
  ["/auth login", "Log in to a provider that supports OAuth."],
  ["/quit", "Exit the session."],
];

export const Route = createFileRoute("/docs/commands")({
  head: () => ({ meta: [{ title: "Commands — async-coder docs" }] }),
  component: () => (
    <DocsLayout
      title="Slash commands"
      description="Everything you can type after a leading slash in the prompt."
    >
      <H2 id="reference">Reference</H2>
      <P>Tab-complete commands at the prompt. Order is mostly stable across releases.</P>
      <div className="overflow-x-auto rounded-xl border border-border/60">
        <table className="w-full text-sm">
          <thead className="bg-panel/60">
            <tr className="text-left">
              <th className="px-4 py-2.5 font-medium">Command</th>
              <th className="px-4 py-2.5 font-medium">Description</th>
            </tr>
          </thead>
          <tbody>
            {CMDS.map(([c, d], i) => (
              <tr key={c} className={i % 2 ? "bg-panel/30" : ""}>
                <td className="px-4 py-2.5"><InlineCode>{c}</InlineCode></td>
                <td className="px-4 py-2.5 text-muted-foreground">{d}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DocsLayout>
  ),
});
