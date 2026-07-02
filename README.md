# Transmission Remote

A modern cross-platform desktop client for remote-controlling [Transmission](https://transmissionbt.com)
daemons — a successor to the abandoned [transgui](https://github.com/transmission-remote-gui/transgui),
built for Apple Silicon, Windows, and Linux.

Electron + TypeScript + React, with Redux Toolkit / RTK Query for state. All RPC traffic
runs through the Electron main process (see [ADR-0001](docs/adr/0001-rpc-via-main-process.md));
passwords are stored with the OS keychain via `safeStorage`.

Requires a Transmission **4.x** daemon (RPC version 17+).

## Documentation

- [Product requirements (PRD)](docs/PRD.md) — problem, users, requirement tables with status, release plan
- [Architecture](docs/ARCHITECTURE.md) — process model, data flow, state, security, testing
- [Domain glossary](CONTEXT.md) — the canonical vocabulary used in code and UI
- [Decision records](docs/adr/) — 0001 RPC-via-main-process, 0002 flexible panel workspace

## Features (MVP)

- Multiple server profiles, one active at a time, quick switching
- Torrent list with live polling, search, sorting (persisted per server), and
  sidebar filters by status, tracker, and label
- Add torrents by magnet link, `.torrent` file, or drag-and-drop, with destination
  folder, free-space check, file selection, and start-paused
- OS integration: the app registers as handler for `magnet:` links and `.torrent` files
- Detail panel: general info, per-file wanted/priority, peers, tracker management
- Session settings (speed limits, alt-speed turtle, seeding limits, encryption, port test)
- Light/dark theme

## Development

```sh
nvm use               # Node 22
npm install
cd dev-daemon && docker compose up -d && cd ..   # test daemon at localhost:9091 (dev/devpass)
npm run dev
```

Run tests with `npm test`, typecheck with `npm run typecheck`.

## Release

Tag `v*` and push; GitHub Actions builds signed artifacts for macOS (DMG, notarized),
Windows (NSIS), and Linux (AppImage + deb) and publishes a GitHub release consumed by
the in-app auto-updater. Required repo secrets: `CSC_LINK`, `CSC_KEY_PASSWORD`,
`APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID`.
