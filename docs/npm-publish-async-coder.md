# Publish async-coder to npm

This guide publishes the fixed Windows release as version `0.1.1`.

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

3. Make sure the scoped installer package is available:

   ```powershell
   npm view @async-coder/cli version
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
$env:ASYNC_CODER_VERSION = "0.1.1"
$env:ASYNC_CODER_CHANNEL = "latest"
bun run script/build.ts --single --skip-install
```

Expected smoke-test output:

```text
Smoke test passed: async-coder 0.1.1
```

The Windows binary package is generated at:

```text
packages/opencode/dist/binary-windows-x64
```

## Publish Windows binary and installer package

The publish script publishes every binary package present in `packages/opencode/dist`, then publishes the installer package `@async-coder/cli`.

For a Windows-only first release, keep only `dist/binary-windows-x64` before running publish:

```powershell
cd packages/opencode
Remove-Item -Recurse -Force .\dist\@async-coder\cli -ErrorAction SilentlyContinue
$env:ASYNC_CODER_VERSION = "0.1.1"
$env:ASYNC_CODER_CHANNEL = "latest"
bun run script/publish.ts
```

This publishes:

- `@async-coder/binary-windows-x64@0.1.1`
- `@async-coder/cli@0.1.1`

If npm asks for a one-time password, enter the OTP from your authenticator.

## Manual dry-run / pack path

Use this if you want to inspect tarballs before publishing.

```powershell
cd packages/opencode/dist/binary-windows-x64
Remove-Item *.tgz -ErrorAction SilentlyContinue
bun pm pack
npm publish *.tgz --access public --tag latest
```

Then create and publish the installer package:

```powershell
cd ..\..
Remove-Item -Recurse -Force .\dist\@async-coder\cli -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Force .\dist\@async-coder\cli | Out-Null
Copy-Item -Recurse .\bin .\dist\@async-coder\cli\bin
Copy-Item .\script\postinstall.mjs .\dist\@async-coder\cli\postinstall.mjs
Copy-Item ..\..\LICENSE .\dist\@async-coder\cli\LICENSE
Copy-Item ..\..\README_npm.md .\dist\@async-coder\cli\README.md
```

Create `packages/opencode/dist/@async-coder/cli/package.json`:

```json
{
  "name": "@async-coder/cli",
  "version": "0.1.1",
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
    "@async-coder/binary-windows-x64": "0.1.1"
  }
}
```

Pack and publish:

```powershell
cd packages/opencode/dist/@async-coder/cli
Remove-Item *.tgz -ErrorAction SilentlyContinue
bun pm pack
npm publish *.tgz --access public --tag latest
```

## Verify after publishing

On a clean Windows machine:

```powershell
npm install -g @async-coder/cli
async-coder --version
async-coder
```

Expected version output:

```text
async-coder 0.1.1
```
