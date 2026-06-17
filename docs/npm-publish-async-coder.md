# Publish async-coder to npm

This guide publishes the first public Windows release as version `0.1.0`.

Repository: <https://github.com/Mr-Dark-debug/Async-coder-cli>

## Prerequisites

1. Install dependencies:

   ```powershell
   bun install
   ```

2. Log in to npm:

   ```powershell
   npm adduser
   npm whoami
   ```

3. Make sure the unscoped package is still available:

   ```powershell
   npm view async-coder version
   ```

   A `404 Not Found` means the name is available.

4. Make sure your npm account can publish the `@async-coder` scope. Create the scope on npmjs.com if needed.

## Verify before publishing

Run these from package directories, not the repo root:

```powershell
cd packages/opencode
bun typecheck
bun test test\provider\error.test.ts test\provider\transform.test.ts test\storage\json-migration.test.ts test\project\project-id.test.ts
```

Optional workspace package checks:

```powershell
cd ..\shared; bun typecheck
cd ..\plugin; bun typecheck
cd ..\sdk\js; bun typecheck
cd ..\..\ui; bun typecheck
```

## Build the Windows package

From `packages/opencode`:

```powershell
$env:ASYNC_CODER_VERSION = "0.1.0"
$env:ASYNC_CODER_CHANNEL = "latest"
bun run script/build.ts --single --skip-install
```

Expected smoke-test output:

```text
Smoke test passed: async-coder 0.1.0
```

The Windows binary package is generated at:

```text
packages/opencode/dist/binary-windows-x64
```

## Publish Windows binary and root package

The publish script publishes every binary package present in `packages/opencode/dist`, then publishes the root `async-coder` package.

For a Windows-only first release, keep only `dist/binary-windows-x64` before running publish:

```powershell
cd packages/opencode
Remove-Item -Recurse -Force .\dist\async-coder -ErrorAction SilentlyContinue
$env:ASYNC_CODER_VERSION = "0.1.0"
$env:ASYNC_CODER_CHANNEL = "latest"
bun run script/publish.ts
```

This publishes:

- `@async-coder/binary-windows-x64@0.1.0`
- `async-coder@0.1.0`

If npm asks for a one-time password, enter the OTP from your authenticator.

## Manual dry-run / pack path

Use this if you want to inspect tarballs before publishing.

```powershell
cd packages/opencode/dist/binary-windows-x64
Remove-Item *.tgz -ErrorAction SilentlyContinue
bun pm pack
npm publish *.tgz --access public --tag latest
```

Then create and publish the root package:

```powershell
cd ..\..
Remove-Item -Recurse -Force .\dist\async-coder -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Force .\dist\async-coder | Out-Null
Copy-Item -Recurse .\bin .\dist\async-coder\bin
Copy-Item .\script\postinstall.mjs .\dist\async-coder\postinstall.mjs
Copy-Item ..\..\LICENSE .\dist\async-coder\LICENSE
Copy-Item ..\..\README_npm.md .\dist\async-coder\README.md
```

Create `packages/opencode/dist/async-coder/package.json`:

```json
{
  "name": "async-coder",
  "version": "0.1.0",
  "description": "async-coder: a multi-provider async coding agent",
  "license": "MIT",
  "author": "async-coder",
  "homepage": "https://github.com/Mr-Dark-debug/Async-coder-cli",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/Mr-Dark-debug/Async-coder-cli.git"
  },
  "bugs": {
    "url": "https://github.com/Mr-Dark-debug/Async-coder-cli/issues"
  },
  "keywords": ["ai", "cli", "code", "coding-agent", "groq", "openrouter", "lavender"],
  "bin": {
    "async-coder": "./bin/async-coder"
  },
  "scripts": {
    "postinstall": "bun ./postinstall.mjs || node ./postinstall.mjs"
  },
  "optionalDependencies": {
    "@async-coder/binary-windows-x64": "0.1.0"
  }
}
```

Pack and publish:

```powershell
cd packages/opencode/dist/async-coder
Remove-Item *.tgz -ErrorAction SilentlyContinue
bun pm pack
npm publish *.tgz --access public --tag latest
```

## Verify after publishing

On a clean Windows machine:

```powershell
npm install -g async-coder
async-coder --version
async-coder
```

Expected version output:

```text
async-coder 0.1.0
```
