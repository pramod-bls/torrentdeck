# 0006 — Watch folders: client-side, poll-based, only while running

Date: 2026-07-04
Status: accepted, planned

## Context

Users want a folder they can drop `.torrent` files into and have them auto-added to a
server — the classic "watch/blackhole folder." Two fundamentally different places can host
this:

- **Daemon-side.** Each daemon already has one: Transmission `watch-dir`, qBittorrent
  `scan_dirs`, Deluge's AutoAdd plugin. Always-on (runs even when TorrentDeck is closed),
  but the watched folder lives **on the daemon's host** — which for the common
  remote-seedbox setup is a machine the user can't easily drop files onto, and each daemon
  configures it differently (a plugin on Deluge).

- **Client-side.** TorrentDeck watches a folder on the machine it runs on, reads each
  `.torrent`, and adds it over RPC (the file's bytes travel in the add call, so no shared
  filesystem is needed). Uniform across daemons and works against a remote daemon — but
  only runs while the app is open.

The app already reads `.torrent` files to base64 and adds them via `metainfoBase64`
(`src/main/index.ts`), so the client-side add path is free to reuse.

## Decision

1. **Client-side, per–Server Profile.** A Watch Folder is configured on the profile
   (`{ enabled, path, downloadDir?, paused, label? }`) and adds to that one server. Chosen
   over the daemon-side watch-dirs because the folder must be somewhere the user can
   actually drop files (their own machine), it works uniformly for remote daemons, and it
   needs no per-daemon plugin setup. Accepted cost: **watching only happens while
   TorrentDeck is running.**

2. **Poll-based scan, not `fs.watch`.** A periodic directory scan (~10 s) rather than
   native filesystem events. `fs.watch` is unreliable across macOS/Windows/Linux and
   especially on network shares (a likely location for a drop folder); polling is simple
   and dependable, and a 10 s cadence is fine for this use. A **size-stability guard**
   (file size unchanged across two scans) avoids reading a half-copied `.torrent`, and a
   **startup sweep** ingests anything dropped while the app was closed.

3. **Move-based disposition, no persisted "seen" set.** A successfully added file moves to
   `.added/`; a permanently rejected one moves to `.failed/`. Because handled files leave
   the watch directory, dedup is inherent — no database of processed hashes to persist or
   corrupt. Transient failures (server offline, network) **leave the file in place** to be
   retried on the next scan; duplicates (already on the server) are treated as handled and
   moved to `.added/` silently.

4. **Inherits the Size Filter and add defaults.** Watch-added torrents apply the profile's
   Size Threshold and honor the per-folder download dir / paused / label — so automation
   and the junk filter compose rather than being separate code paths.

## Consequences

- No always-on ingestion: files dropped while the app is closed are picked up on next
  launch, not immediately. Acceptable for a desktop client; users needing 24/7 ingestion
  can still configure the daemon's own watch-dir out of band.
- No new capability flag — the feature is pure client + RPC add, identical for all daemons.
- `.added/`/`.failed/` subfolders appear inside the user's watch folder; this is visible
  and intentional (audit trail), not hidden state.
- Polling means up to ~10 s latency between drop and add, and a tiny periodic `readdir`
  cost per enabled folder — negligible.

## Alternatives considered

**Daemon-side watch-dir/scan_dirs/AutoAdd** — rejected as the primary: folder lives on the
remote host, per-daemon configuration (Deluge needs a plugin), and inconsistent surface.
Left available to power users out of band. **`fs.watch`/chokidar events** — rejected:
cross-platform flakiness and poor network-share behavior for marginal latency gain.
**Persisted seen-set with leave-in-place** — rejected: move-based disposition gets dedup
for free without state that can drift.
