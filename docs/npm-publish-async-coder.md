# Publish async-coder to npm

Release packages in dependency order. The regular install is `@async-coder/cli`; its optional platform dependencies contain the native executable. This guide uses 0.2.0.

Repository: [Async-coder-cli](https://github.com/Mr-Dark-debug/Async-coder-cli).

## Prepare and verify

Preserve unrelated changes, regenerate the SDK with `bun run ./packages/sdk/js/script/build.ts`, then run `bun typecheck` and tests from the affected package directories. Run the full core suite from `packages/opencode`, never the repository root. Commit and push release preparation before publishing.

From `packages/opencode`, build and stage without publishing:

```powershell
$env:ASYNC_CODER_VERSION = "0.2.0"
$env:ASYNC_CODER_CHANNEL = "latest"
bun run script/build.ts --single --skip-install
bun run script/stage-release.ts
```

The build must report `Smoke test passed: async-coder 0.2.0`. Omit `--single` to build all platform targets; cross-compilation does not prove execution on another operating system. Staging includes only the successfully built runtimes. Publish every included runtime before the installer.

If Bun on Windows reports `Failed to extract executable`, download the official runtimes with SHA256 verification and provide their build directory explicitly:

```powershell
bun run script/fetch-build-runtimes.ts
$env:ASYNC_CODER_BUILD_RUNTIME_DIR = Join-Path $PWD '.artifacts/build-runtimes'
bun run script/build.ts --skip-install
```

This uses Bun's `compile.executablePath`; it preserves the installed Bun version and the user's cache. [Bun executable documentation](https://bun.sh/docs/bundler/executables).

Pack explicitly from each package directory:

```powershell
npm pack
```

Inspect the tarball contents and generated manifests. Do not set `NPM_CONFIG_DRY_RUN=true` for the publish script: npm can report a filename without creating it. The repository-root publish script also publishes SDK/plugin packages, so do not use it for a CLI-only release.

## Authentication and publication

Check `npm whoami`. If it returns E401, run `npm login` and complete npm's browser authentication. Publishing requires an interactive terminal for browser-based 2FA. Run the following in a visible PowerShell terminal, or a real TTY; allow npm to open and poll its authorization page. Do not retry from a non-interactive shell or extract authorization codes from logs.

From `packages/opencode/dist/binary-windows-x64`:

```powershell
npm publish .\async-coder-binary-windows-x64-0.2.0.tgz --access public --tag latest
npm view @async-coder/binary-windows-x64@0.2.0 version dist-tags --json
```

Publish and verify any other staged runtime packages next. Then, from `packages/opencode/dist/@async-coder/cli`:

```powershell
npm publish .\async-coder-cli-0.2.0.tgz --access public --tag latest
npm view @async-coder/cli@0.2.0 version dist-tags optionalDependencies --json
```

## Registry installation verification

Create a new temporary installation prefix, then install the exact registry version and execute it:

```powershell
$releaseSmoke = Join-Path ([System.IO.Path]::GetTempPath()) ("async-coder-release-" + [guid]::NewGuid())
npm install --prefix $releaseSmoke @async-coder/cli@0.2.0
& "$releaseSmoke\node_modules\.bin\async-coder.cmd" --version
```

Expected output: `async-coder 0.2.0`. This registry installation is a separate gate from running a build-tree executable or installing a local tarball.

## GitHub release

Create an annotated `v0.2.0` tag and a draft titled `async-coder 0.2.0 — code intelligence and parallel work`. Attach the binary tarballs, installer tarball and `SHA256SUMS.txt`. Keep the release draft if tests, npm publication, authentication or registry installation verification fails.

Only after all npm packages and the clean-install smoke test pass:

```powershell
gh release edit v0.2.0 --draft=false --latest
gh release view v0.2.0 --json name,tagName,isDraft,publishedAt,assets,url
npm view @async-coder/cli@latest version
npm view @async-coder/binary-windows-x64@latest version
```
