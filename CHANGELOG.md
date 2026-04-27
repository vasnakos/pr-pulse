# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2026-04-27

### Added
- Compact mode with a stripped-down header, dense PR rows, and auto-resizing to content height.
- Quick exit-from-compact control in the header for returning to the full widget.
- Compact-mode toggle in the settings panel.

### Changed
- Window sizing now applies a smaller minimum height in compact mode and restores expanded bounds when leaving it.
- Refined compact-mode settings panel sizing to avoid full-screen stretching.

## [0.1.0] - 2026-04-24

### Added
- Initial release of PR Pulse.
- Transparent, frameless Electron widget for GitHub pull requests.
- Window modes for `desktop`, `floating`, and `normal`.
- Tray controls and global shortcut support.
- GitHub polling, persisted settings, and native notifications.
- Sections for review requests, assigned PRs, and authored PRs.
- Dedicated `approved by me` lane.
- Muted PR support with per-PR context menu actions.
- Background notification reliability improvements for PR activity changes.
- Cross-platform packaging for macOS, Windows, and Linux via `electron-builder`.
- Docker-based Linux and Windows build flows (`Dockerfile.build`, `docker-compose.yml`).
- GitHub Actions release workflow for automated multi-platform builds.
- MIT license.

### Changed
- Expanded the build and release documentation in `README.md`.

[0.2.0]: https://github.com/vasilisnakos/pr-pulse/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/vasilisnakos/pr-pulse/releases/tag/v0.1.0
