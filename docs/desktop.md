# Desktop application

The Electron desktop shares the application UI: session tabs, file explorer, side-by-side diffs, terminal and provider/permission/appearance settings. Session and file tabs are independent; closing a tab does not delete its session. Lavender is the default theme.

Closing the main window hides it to the tray. The tray reopens or quits the application; explicit quit shuts it down. Completion notifications use the existing notification bridge and OS permissions.

```sh
bun install
cd packages/desktop
bun dev
bun typecheck
bun run build
```

Prebuild creates the Node sidecar and assets. `bun run package:win`, `package:mac` or `package:linux` creates installers on suitable hosts. Signing and native platform verification are separate gates. Tests cover tab state and background decisions; browser and packaging results are recorded in release evidence.
