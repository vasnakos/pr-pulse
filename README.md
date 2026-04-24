# PR Pulse

> The heartbeat of your GitHub pull requests, on your desktop.

**PR Pulse** is a developer-focused Electron widget for macOS and Windows that keeps your
GitHub pull request activity quietly visible while you work. Terminal-inspired, ambient,
and keyboard-friendly.

_"PR Pulse" is an independent open-source project and is not affiliated with, endorsed by,
or sponsored by GitHub, Inc._

## Features

- Frameless, transparent floating panel with a neon-green terminal aesthetic
- Three window modes:
  - **desktop** — pinned to the macOS desktop layer, behind app windows (like the native Weather widget)
  - **floating** — always on top of other windows
  - **normal** — regular z-order
- macOS vibrancy so the widget blends into the wallpaper
- Tray entry point with refresh, settings, and quick toggle
- Global shortcut `⌥⌘G` (`Ctrl+Alt+G` on Windows/Linux) to show/hide the widget
- Optional launch-at-login mode (starts hidden so notifications continue in background)
- Three PR sections:
  - Review requested from you
  - Assigned to you
  - Authored by you
- Dedicated **approved by me** lane plus an `approved-only` filter toggle
- Native desktop notifications for:
  - new review requests / assignments
  - new comments on your PRs
  - new commits pushed to open PRs
  - stale approvals after new pushes
  - draft → ready-for-review transitions
  - approvals
  - changes requested, merged, or closed PRs
- Persisted window position, size, opacity, notification preferences, and mode

## Screenshots

_Add a screenshot of the widget on your desktop here before publishing._

## Installation

### Download

Grab the latest `PR Pulse-<version>-arm64.dmg` (Apple Silicon) or
`PR Pulse-<version>-x64.dmg` (Intel) from the [releases page][releases] and drag
`PR Pulse.app` into `/Applications`.

On first launch macOS will show a Gatekeeper warning because the app is unsigned.
Right-click the app in `/Applications` → **Open** → **Open** to allow it. Only
needed once.

[releases]: https://github.com/vasilisnakos/pr-pulse/releases

### Build from source

```bash
git clone https://github.com/vasilisnakos/pr-pulse.git
cd pr-pulse
npm install
npm run dev              # develop with hot reload
npm run dist:mac         # build a .dmg into dist/
npm run dist:win         # build an NSIS .exe into dist/
```


## GitHub token scopes

Create a classic or fine-grained personal access token that can read pull
requests and issue metadata. For a classic PAT these scopes are sufficient:

- `repo`
- `read:user`

Paste the token into the widget's settings panel on first launch; it is stored
locally via `electron-store` under your user's app-support directory and is
never transmitted anywhere except to `api.github.com`.

## Keyboard & mouse

| Action | How |
| --- | --- |
| Toggle widget visibility | `⌥⌘G` (macOS) / `Ctrl+Alt+G` (Win/Linux), tray click, or `:q` button |
| Open settings | header `settings` button, or tray menu |
| Refresh now | header `refresh` button, or tray menu |
| Open a PR | click the PR card |

## Architecture

- **Main process** (`src/main/`) — Electron lifecycle, window management, tray, GitHub polling, notifications, persistence.
- **Preload** (`src/preload/`) — contextIsolation-safe bridge that exposes a typed IPC surface (`window.widgetApi`).
- **Renderer** (`src/renderer/`) — React + Vite; the UI the user sees inside the panel.
- **Shared types** (`src/shared/`) — type definitions shared by main and renderer.

Built with:

- Electron 41, `electron-vite`, `electron-builder`
- React 19
- `@octokit/rest` for the GitHub API
- `electron-store` for persistence

## Notes & limits

- **Code signing / notarization are not configured.** macOS Gatekeeper and Windows SmartScreen
  warnings are expected for these unsigned builds. Signing requires an Apple Developer
  Program membership (macOS) and a code-signing certificate (Windows).
- **Windows "desktop" mode is a best-effort fallback.** Electron does not expose a stable
  HWND-to-Progman parenting API, so on Windows the `desktop` mode degrades to a non-topmost
  floating window.
- **Not a WidgetKit widget.** Apple's Notification Center widget gallery requires a native
  Swift companion. PR Pulse is a standalone Electron app that *behaves* like one.

## License

MIT
