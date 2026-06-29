- Always use superpowers skill instead of builtin plan mode.
- To regenerate the JavaScript SDK, run `./packages/sdk/js/script/build.ts`.
- ALWAYS USE PARALLEL TOOLS WHEN APPLICABLE.
- The default branch in this repo is `dev`.
- Local `main` ref may not exist; use `dev` or `origin/dev` for diffs.
- Prefer automation: execute requested actions without confirmation unless blocked by missing info or safety/irreversibility.

## Style Guide

### General Principles

- Keep things in one function unless composable or reusable
- Avoid `try`/`catch` where possible
- Avoid using the `any` type
- Use Bun APIs when possible, like `Bun.file()`
- Rely on type inference when possible; avoid explicit type annotations or interfaces unless necessary for exports or clarity
- Prefer functional array methods (flatMap, filter, map) over for loops; use type guards on filter to maintain type inference downstream
- In `src/config`, follow the existing self-export pattern at the top of the file (for example `export * as ConfigAgent from "./agent"`) when adding a new config module.

Reduce total variable count by inlining when a value is only used once.

```ts
// Good
const journal = await Bun.file(path.join(dir, "journal.json")).json()

// Bad
const journalPath = path.join(dir, "journal.json")
const journal = await Bun.file(journalPath).json()
```

### Destructuring

Avoid unnecessary destructuring. Use dot notation to preserve context.

```ts
// Good
obj.a
obj.b

// Bad
const { a, b } = obj
```

### Variables

Prefer `const` over `let`. Use ternaries or early returns instead of reassignment.

```ts
// Good
const foo = condition ? 1 : 2

// Bad
let foo
if (condition) foo = 1
else foo = 2
```

### Control Flow

Avoid `else` statements. Prefer early returns.

```ts
// Good
function foo() {
  if (condition) return 1
  return 2
}

// Bad
function foo() {
  if (condition) return 1
  else return 2
}
```

### Schema Definitions (Drizzle)

Use snake_case for field names so column names don't need to be redefined as strings.

```ts
// Good
const table = sqliteTable("session", {
  id: text().primaryKey(),
  project_id: text().notNull(),
  created_at: integer().notNull(),
})

// Bad
const table = sqliteTable("session", {
  id: text("id").primaryKey(),
  projectID: text("project_id").notNull(),
  createdAt: integer("created_at").notNull(),
})
```

## Testing

- Avoid mocks as much as possible
- Test actual implementation, do not duplicate logic into tests
- Tests cannot run from repo root (guard: `do-not-run-tests-from-root`); run from package dirs like `packages/opencode`.

## Type Checking

- Always run `bun typecheck` from package directories (e.g., `packages/opencode`), never `tsc` directly.

## Publishing a Release

Use this order for public releases. Do not publish the GitHub release before npm is verified.

1. Inspect `git status` and preserve unrelated user changes. Update the release version in the public package manifests, lockfile, README files, installer examples, and release notes. Commit and push the release preparation first.
2. Regenerate the JavaScript SDK with `./packages/sdk/js/script/build.ts` and run package-level typechecks/tests.
3. Build the Windows release from `packages/opencode`:

   ```powershell
   $env:ASYNC_CODER_VERSION = "<version>"
   $env:ASYNC_CODER_CHANNEL = "latest"
   bun run script/build.ts --single --skip-install
   ```

   The build must report `Smoke test passed: async-coder <version>`.

4. Confirm npm authentication with `npm whoami`. If it returns `E401`, run `npm login` and let the user complete npm's browser authentication.
5. Publish in dependency order and verify each package before continuing:

   ```powershell
   npm publish .\async-coder-binary-windows-x64-<version>.tgz --access public --tag latest
   npm view @async-coder/binary-windows-x64@<version> version dist-tags --json

   npm publish .\async-coder-cli-<version>.tgz --access public --tag latest
   npm view @async-coder/cli@<version> version dist-tags optionalDependencies --json
   ```

   The runtime tarball is under `packages/opencode/dist/binary-windows-x64`. The installer tarball is under `packages/opencode/dist/@async-coder/cli` after staging/packing.

6. npm publish requires a real TTY for browser-based 2FA. In a non-interactive agent shell, do not repeatedly retry, scrape npm debug logs, or request/print an OTP. Launch the publish command in a visible interactive PowerShell window and wait for it, or ask the user to run that exact publish command in their terminal. Let npm open and poll its own authorization page.
7. Smoke-test the registry package in a new temporary prefix, then run its installed executable:

   ```powershell
   npm install --prefix <temp-dir> @async-coder/cli@<version>
   & <temp-dir>\node_modules\.bin\async-coder.cmd --version
   ```

8. Prepare a draft GitHub release titled `async-coder <version> — <short theme>`. Attach:

   - `async-coder-binary-windows-x64-<version>.tgz`
   - `async-coder-cli-<version>.tgz`
   - `SHA256SUMS.txt`

9. Only after both npm packages and the clean-install smoke test are verified, publish the draft:

   ```powershell
   gh release edit v<version> --draft=false --latest
   gh release view v<version> --json name,tagName,isDraft,publishedAt,assets,url
   npm view @async-coder/cli@latest version
   npm view @async-coder/binary-windows-x64@latest version
   ```

Important release notes:

- The normal public install path is `@async-coder/cli`; `@async-coder/binary-windows-x64` is its platform runtime dependency.
- `script/publish.ts` at the repository root also attempts to publish the SDK and plugin. Do not use it for a CLI-only release unless those packages are intentionally part of the release.
- `NPM_CONFIG_DRY_RUN=true` is incompatible with `packages/opencode/script/publish.ts`: npm prints a tarball name without creating the file, then the script fails while looking for it. Use explicit `npm pack` commands for package inspection.
- Keep the GitHub release as a draft if npm authentication, 2FA, package publication, or smoke verification fails.
