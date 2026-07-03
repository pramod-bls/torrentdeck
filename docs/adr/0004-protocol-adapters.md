# 0004 — Protocol adapters for multiple daemons (Transmission + Deluge)

Date: 2026-07-03
Status: accepted, implemented (v0.7)

## Context

The app was Transmission-only: the renderer's RTK Query endpoints emitted raw
Transmission RPC method names (`torrent-get`, `torrent-set`, `queue-move-up`) straight
across the IPC bridge, renderer-side transforms (`tableToObjects`, `deriveSwarm`,
`deriveAvailRatio`) normalized the replies, and the main-process client hard-wired the
409 `X-Transmission-Session-Id` handshake and the `{result:'success', arguments}`
envelope. Nothing recorded which protocol a profile spoke.

Supporting Deluge means reconciling two very different daemons: Deluge identifies
torrents by infohash string (no numeric id), reports string states (not an int enum),
scales progress 0–100, gates labels/blocklist/scheduler behind plugins, has no bandwidth
groups, and its Web UI is a thin client that must be bound to a backing `deluged` before
`core.*` works. ADR-0001 already established that all RPC crosses IPC through
`window.api`; this ADR decides where the *protocol* difference is reconciled.

## Decision

1. **Neutral capability API, reconciled in the main process.** The renderer stopped
   sending raw method names. It now invokes intent-level operations
   (`{ profileId, op, params }` where `op` is `getTorrents`, `torrentAction`,
   `setTorrent`, …). Each profile is backed by a `TorrentClient` adapter
   (`TransmissionAdapter`, `DelugeAdapter`) selected by `serverType`; the adapter talks
   the daemon's native RPC and returns **already-normalized shared types**. The
   Transmission normalization that used to live in `rpcApi.ts` moved into
   `TransmissionAdapter`, where it belongs. Rejected: making the Deluge side masquerade
   as Transmission's wire format (fragile — every Transmission quirk, table format and
   snake_case included, would have to be reproduced), and branching on `serverType` in
   the renderer (scatters protocol logic across the UI).

2. **Infohash string is the universal torrent identity.** Canonical `Torrent.id` is the
   40-char infohash for both daemons. Transmission RPC accepts hashes anywhere it accepts
   numeric ids, so its calls keep working while Deluge (which has only the hash) fits
   without a surrogate. Selection, RTK cache keys, and drag-to-reorder are keyed on it.

3. **Capabilities descriptor, unsupported controls hidden.** Each adapter reports a
   `Capabilities` object; some flags are static (Deluge has no groups/scheduler/blocklist/
   per-piece availability), others probed live (Deluge `labels` ← Label plugin). The UI
   reads it through `useServerCapabilities`/`can()` and omits controls a server can't
   honor, permissively defaulting to "shown" while the probe is in flight so Transmission
   never flickers.

4. **Deluge is reached via `deluge-web` `/json`, not the native daemon socket.** The Web
   UI's HTTP JSON-RPC reuses the existing `postJson`-style transport; the native
   `deluged` protocol (TLS + zlib + rencode over a persistent socket) would be a large,
   out-of-shape implementation. Auth is a password→`_session_id` cookie owned by the
   Deluge client, which also auto-binds an unbound Web UI to its sole/default `deluged`
   host and re-logs-in once on session expiry.

## Consequences

- Adding a third daemon = one new `TorrentClient` implementation + a factory case; the
  renderer and IPC surface are untouched.
- Normalization is centralized and unit-testable per adapter (`deluge/normalize.ts`).
- Deluge degrades gracefully where data is thinner: no per-piece bitfield (the pieces map
  shows progress only), swarm from `total_seeds`/`total_peers` rather than per-tracker
  scrape, availability from `distributed_copies`.
- A few operations are Deluge-unsupported by design in v1 (path rename, port test); their
  adapter methods return a clean `rpc` error and the capability hides the trigger.
- The Deluge Web UI must be running and reachable; the app does not speak to `deluged`
  directly. Multi-host Web UIs need one host bound (auto if there's only one).

## Alternatives considered

**Transmission-as-lingua-franca** (Deluge adapter mimics Transmission's wire shape so the
renderer is untouched) — rejected as fragile mimicry. **`string | number` id union** —
rejected: pushes branching to every RPC-targeting and cache site forever. **Native
`deluged` protocol** — rejected for v1: heavy binary/socket implementation for no user
benefit over the Web UI path.
