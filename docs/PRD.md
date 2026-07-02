# Product Requirements — Transmission Remote

| | |
|---|---|
| Status | Living document |
| Owner | Pramod Butte |
| Last updated | 2026-07-02 |
| Related | [ARCHITECTURE.md](ARCHITECTURE.md) · [CONTEXT.md](../CONTEXT.md) · [ADRs](adr/) |

## 1. Problem

[transgui](https://github.com/transmission-remote-gui/transgui) was the best remote
client for the Transmission BitTorrent daemon: fast, keyboard-friendly, multi-server.
It is abandoned, written in Free Pascal/Lazarus, and no longer runs on Apple Silicon
Macs. People who run Transmission headless on a NAS or seedbox and drive it from a
desktop are left with the daemon's bare web UI or nothing.

**Transmission Remote** is a maintained, cross-platform successor: transgui's
functionality with a modern UI, distributed as signed native installers.

## 2. Users and primary jobs

A self-hosting enthusiast running Transmission on one or more remote machines
(home NAS, seedbox, home-lab VM), who wants to:

1. **Monitor** — glance at what's downloading/seeding, speeds, and problems.
2. **Act** — add (magnet/.torrent), pause, resume, remove, reprioritize files.
3. **Manage** — labels, trackers, data location, per-daemon settings.
4. **Switch** — move between several servers with zero re-configuration.

## 3. Goals / non-goals

**Goals**

- Functional parity with transgui's daily-driver core (v0.1 ✅, shipped).
- First-class OS integration: default handler for `magnet:` and `.torrent`.
- Secure by construction: credentials in the OS keychain, no plaintext secrets,
  sandboxed renderer (see [ADR-0001](adr/0001-rpc-via-main-process.md)).
- macOS (Apple Silicon), Windows, and Linux from a single codebase, auto-updating.
- A **flexible workspace**: the UI is composed of panels the user can add, remove,
  resize, and rearrange rather than a fixed chrome (see §6 and
  [ADR-0002](adr/0002-flexible-panel-workspace.md)).

**Non-goals**

- Being a torrent *client* — the app never downloads torrent data itself; it only
  remote-controls a Transmission daemon.
- Supporting Transmission < 4.0 (RPC version < 17), rTorrent, qBittorrent, or Deluge.
- Torrent search/indexing, RSS auto-download (may be revisited post-1.0), streaming.
- Mobile or web deployment.

## 4. Requirements

Priority: **P0** = must have (MVP), **P1** = should have, **P2** = nice to have.
Status reflects the current build.

### 4.1 Connectivity and profiles

| ID | Requirement | Pri | Status |
|----|-------------|-----|--------|
| C1 | Multiple named Server Profiles (host, port, HTTPS, RPC path, credentials) | P0 | ✅ |
| C2 | One Active Server at a time; instant switching; all state keyed per profile | P0 | ✅ |
| C3 | Passwords encrypted at rest via OS keychain (safeStorage); never exposed to the UI process | P0 | ✅ |
| C4 | Per-profile trust of self-signed HTTPS certificates | P0 | ✅ |
| C5 | "Test connection" with actionable error messages (auth vs TLS vs network) | P0 | ✅ |
| C6 | Automatic CSRF (409 session-id) handling and retry | P0 | ✅ |
| C7 | View several servers simultaneously (workspace panels per server) | P2 | — |

### 4.2 Torrent list

| ID | Requirement | Pri | Status |
|----|-------------|-----|--------|
| L1 | Live-updating list (configurable 1–10 s polling), virtualized to thousands of rows | P0 | ✅ |
| L2 | Row shows name, progress, status, speeds, ratio/ETA, peer counts | P0 | ✅ |
| L3 | Sort by name, size, progress, status, ↓/↑ speed, ratio, ETA, added date, queue position; direction toggle; persisted per profile | P0 | ✅ |
| L4 | Sidebar filters: status groups with counts, trackers, labels; combinable with text search | P0 | ✅ |
| L5 | Multi-select (⌘/Ctrl-click) with bulk actions | P0 | ✅ |
| L6 | Context menu: start, start now, pause, verify, reannounce, remove | P0 | ✅ |
| L7 | Optional multi-column table view (transgui-style spreadsheet) | P1 | — |
| L8 | Keyboard navigation (arrows, space, delete) and shortcuts | P1 | — |

### 4.3 Adding torrents

| ID | Requirement | Pri | Status |
|----|-------------|-----|--------|
| A1 | Add via magnet link (paste), .torrent file picker, and drag-and-drop | P0 | ✅ |
| A2 | OS-level association: clicking a magnet link or .torrent anywhere opens the add dialog (app running or not) | P0 | ✅ |
| A3 | Add dialog: destination folder with live free-space, start-paused, per-file selection (metainfo parsed locally) | P0 | ✅ |
| A4 | Duplicate detection surfaced to the user | P0 | ✅ |
| A5 | Set labels at add time | P1 | partial (API yes, UI no) |

### 4.4 Torrent detail

| ID | Requirement | Pri | Status |
|----|-------------|-----|--------|
| D1 | Detail view with General / Files / Peers / Trackers tabs | P0 | ✅ |
| D2 | Files: per-file wanted toggle and priority (high/normal/low) | P0 | ✅ |
| D3 | Trackers: list with announce health, add and remove | P0 | ✅ |
| D4 | Edit labels; move data to a new location | P0 | ✅ |
| D5 | Peers: address, client, progress, rates | P0 | ✅ |
| D6 | Files tab renders as a collapsible directory tree | P1 | — (flat list today) |
| D7 | Per-torrent speed limits and seed-ratio overrides | P1 | — |

### 4.5 Daemon and app settings

| ID | Requirement | Pri | Status |
|----|-------------|-----|--------|
| S1 | Session settings: speed limits, alt-speed values, seeding limits, peer limits, encryption, peer port + open-port test | P0 | ✅ |
| S2 | One-click alternative-speed ("turtle") toggle in the status bar | P0 | ✅ |
| S3 | App preferences: theme (system/light/dark), polling rate | P0 | ✅ |
| S4 | Alt-speed scheduler UI | P2 | — |
| S5 | Blocklist management | P2 | — |

### 4.6 Platform and distribution

| ID | Requirement | Pri | Status |
|----|-------------|-----|--------|
| P1 | macOS arm64+x64 (signed, notarized DMG), Windows (NSIS), Linux (AppImage + deb with XDG magnet/torrent registration) | P0 | ✅ config (unreleased) |
| P2 | Auto-update from GitHub releases | P0 | ✅ wired |
| P3 | Single instance; second launch focuses the window and forwards its arguments | P0 | ✅ |
| P4 | System tray / menu-bar mini controller | P2 | — |

### 4.7 Non-functional

- **Performance:** list stays at 60 fps with 2,000+ torrents (virtualized rows;
  pure-function filter/sort, memoized). Poll payloads use Transmission's compact
  `table` format.
- **Security:** see §3 goals; renderer has no network or Node access.
- **Reliability:** RPC failures degrade to an inline error state with the cause;
  polling resumes automatically when the daemon returns.
- **Compatibility:** Transmission 4.0+ (RPC 17+). Verified against 4.0.5 (user's
  NAS) and 4.1.3 (dev container).

## 5. Current UI

Fixed chrome (toolbar with add/bulk actions/sort/search/server switcher/Panels menu;
status bar with aggregate speeds, turtle toggle, torrent count, daemon version)
around a flexible panel Workspace (§6). The default Workspace mirrors the classic
three-zone arrangement: filters | torrent list | tabbed detail.

## 6. Flexible panel workspace (shipped in v0.2)

Modeled on the panel system in the owner's FlimViewer app
(`electron_frontend_for_fastapi_docker_server`), which proved the pattern:
a `react-grid-layout` dashboard where every view is a panel that can be added from a
categorized picker, removed from its header, dragged by a handle, and resized — with
the layout persisted per page through Redux middleware to electron-store.

Requirements:

| ID | Requirement | Pri | Status |
|----|-------------|-----|--------|
| W1 | Panel registry: every major view (torrent list, filter sidebar, each detail tab, session stats) is a registered panel type, declaratively mapped to a component | P1 | ✅ |
| W2 | "Add panel" picker grouped by category; panels removable from a header control | P1 | ✅ |
| W3 | Panels drag by handle and resize on a responsive grid; no overlap (compaction) | P1 | ✅ |
| W4 | Layout persisted per Server Profile via the existing electron-store path; sensible default layout ships out of the box and is restorable ("Reset layout") | P1 | ✅ |
| W5 | Layout schema carries a version number with a migration path (gap identified in the reference app) | P1 | ✅ |
| W6 | Multiple instances of one panel type where meaningful (torrent list allows multiple instances today; per-instance filters and one-list-per-server → C7 still open) | P2 | partial |

Design notes carried over from the reference implementation: UUID instance ids
(never index-based), a single source of truth driving both the picker and
validation, persistence as a middleware side-effect rather than inside reducers.
Decision record: [ADR-0002](adr/0002-flexible-panel-workspace.md).

## 7. Release plan

| Version | Contents |
|---|---|
| **0.1** (now) | MVP core (§4, all P0s) — built and verified against live daemons |
| **0.2** | Flexible panel workspace (§6) ✅; files-as-tree (D6); keyboard shortcuts (L8); labels in add dialog (A5) |
| **0.3** | Multi-column list view (L7); per-torrent limits (D7); tray (P4) |
| **1.0** | Public launch: icon/branding, docs site, auto-update proven in the wild |
| Post-1.0 | Multi-server simultaneous view (C7/W6), scheduler (S4), blocklists (S5), geo-IP peer info |

## 8. Success criteria

- Owner retires transgui for daily use across macOS/Windows/Linux machines.
- A fresh user goes from download → connected to their daemon in under 2 minutes
  without reading docs.
- Zero plaintext credentials on disk (audit: `strings` on the config file).
- Update flow: tagging a release delivers an installed update to all three platforms
  with no manual steps beyond the tag.
