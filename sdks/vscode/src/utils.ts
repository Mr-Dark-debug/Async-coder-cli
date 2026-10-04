import * as vscode from "vscode"

export function fileReference(editor: vscode.TextEditor, selection = true) {
  const path = vscode.workspace.asRelativePath(editor.document.uri, false)
  if (!selection || editor.selection.isEmpty) return `@${path}`
  const start = editor.selection.start.line + 1
  const end = editor.selection.end.line + (editor.selection.end.character === 0 ? 0 : 1)
  return `@${path}#L${start}${end > start ? `-${end}` : ""}`
}

export const actionPrompt = (action: string, reference: string, diagnostics: string[] = []) => {
  if (action === "explainSelection") return `Explain the code in ${reference}, including its purpose and important edge cases.`
  if (action === "generateTests") return `Write meaningful tests for ${reference}, following this project's test conventions. Run the relevant tests.`
  if (action === "reviewFile") return `Review ${reference} for correctness, security and maintainability. Report concrete findings with line references.`
  return `Investigate and fix the issue at ${reference}. ${diagnostics.length ? `Editor diagnostics:\n${diagnostics.join("\n")}` : "Explain the cause and verify the fix."}`
}
