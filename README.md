# TorrentDeck

A modern cross-platform desktop client for remote-controlling [Transmission](https://transmissionbt.com)
and [Deluge](https://deluge-torrent.org) daemons — a successor to the abandoned
[transgui](https://github.com/transmission-remote-gui/transgui), built for Apple Silicon,
Windows, and Linux.

Electron + TypeScript + React, with Redux Toolkit / RTK Query for state. All RPC traffic
runs through the Electron main process (see [ADR-0001](docs/adr/0001-rpc-via-main-process.md)),
where a per-daemon **adapter** translates protocol-neutral operations into each daemon's
native RPC (see [ADR-0004](docs/adr/0004-protocol-adapters.md)); passwords are stored with
the OS keychain via `safeStorage`.

Each server profile picks a **Server Type**:

- **Transmission 4.x** (RPC version 17+) — full feature set.
- **Deluge 2.x** via its Web UI (`deluge-web`, default `:8112/json`). The Web UI must be
  running; the app does not speak to `deluged` directly.
- **qBittorrent 4.1+ / 5.x** via its WebUI API (default `:8080`).

Features a server doesn't support are hidden automatically per profile (see the matrix below).

## Documentation

- [User guide](docs/USER_GUIDE.md) — how to use the app: servers, panels, torrents, settings (with screenshots)
- [Product requirements (PRD)](docs/PRD.md) — problem, users, requirement tables with status, release plan
- [Architecture](docs/ARCHITECTURE.md) — process model, data flow, state, security, testing
- [Domain glossary](CONTEXT.md) — the canonical vocabulary used in code and UI
- [Deluge support](docs/DELUGE.md) — Deluge vs. Transmission capabilities, degrades, and limits
- [Decision records](docs/adr/) — 0001 RPC-via-main-process, 0002 flexible panel workspace, 0003 server-qualified selection, 0004 protocol adapters

## Supported features by server type

| Feature | Transmission 4.x | Deluge 2.x (Web UI) | qBittorrent 4.1+/5.x |
| --- | --- | --- | --- |
| List / add (magnet + file) / remove / start / pause / verify / reannounce | ✓ | ✓ | ✓ |
| Detail: general, files (+ priorities), peers, trackers | ✓ | ✓ | ✓ |
| Per-torrent limits, seed-ratio, queue reorder, free space, global speed limits | ✓ | ✓ | ✓ |
| Sequential download | ✓ (RPC ≥ 18) | ✓ | ✓ |
| Labels | ✓ | ✓ *(Label plugin; single label)* | ✓ *(tags; multiple)* |
| Pieces map | ✓ *(+ per-piece availability)* | — *(progress only)* | ✓ *(have-state; no availability)* |
| Per-tracker swarm scrape | ✓ | approximate *(swarm totals)* | ✓ |
| Path rename | ✓ | — | ✓ |
| Bandwidth groups | ✓ | — | — |
| Alt-speed scheduler | ✓ | — | — |
| Blocklist | ✓ | — | — |
| Port test | ✓ | — | — |

See [docs/DELUGE.md](docs/DELUGE.md) for the full Deluge-vs-Transmission breakdown; each
server type's exact support is reported live via capabilities and unsupported controls
are hidden per profile.

## Features

- Multiple servers (Transmission and/or Deluge) shown together, each panel scoped to the
  server(s) you choose; per-server color coding
- Torrent list with live polling, search, sorting, and per-panel filters by status,
  tracker, and label
- Add torrents by magnet link, `.torrent` file, or drag-and-drop, with destination
  folder, free-space check, file selection, and start-paused
- OS integration: the app registers as handler for `magnet:` links and `.torrent` files
- Detail panel: general info, per-file wanted/priority, peers, tracker management
- Session settings (speed limits, alt-speed turtle, seeding limits, encryption, port test)
- Light/dark theme

The app icon is derived from the [Transmission](https://github.com/transmission/transmission)
project's GPL-licensed icon (recolored, remote badge added) — see `build/icon.svg`.

## Development

```sh
nvm use               # Node 22
npm install
cd dev-daemon && docker compose up -d && cd ..               # Transmission at localhost:9091 (dev/devpass)
cd dev-daemon/deluge && docker compose up -d && cd ../..      # Deluge Web UI at localhost:8112 (password "deluge")
cd dev-daemon/qbittorrent && docker compose up -d && cd ../.. # qBittorrent WebUI at localhost:8080 (admin/adminadmin)
npm run dev
```

Run tests with `npm test`, typecheck with `npm run typecheck`.

## Release

Tag `v*` and push; GitHub Actions builds signed artifacts for macOS (DMG, notarized),
Windows (NSIS), and Linux (AppImage + deb) and publishes a GitHub release consumed by
the in-app auto-updater. Required repo secrets: `CSC_LINK`, `CSC_KEY_PASSWORD`,
`APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID`.
