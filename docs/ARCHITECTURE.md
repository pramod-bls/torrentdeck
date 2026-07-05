# Architecture

How TorrentDeck is put together. For *why* the big decisions were made, see the
ADRs in [docs/adr/](adr/); for domain vocabulary, see [CONTEXT.md](../CONTEXT.md); for
product scope, see [PRD.md](PRD.md).

## Process model

Electron gives us three isolated worlds. Nothing network- or credential-related ever
runs in the renderer ([ADR-0001](adr/0001-rpc-via-main-process.md)).

```
┌────────────────────────────  Main process (Node)  ───────────────────────────┐
│  src/main/index.ts        app lifecycle, window, single-instance lock,       │
│                           magnet:/.torrent OS handoff                        │
│  src/main/ipc.ts          ipcMain.handle() endpoints (the only IPC surface)  │
│  src/main/profiles.ts     profile store (electron-store) + safeStorage       │
│  src/main/rpc/adapters/*  per–server-type adapter (Transmission / Deluge /   │
│                           qBittorrent): native HTTP client + normalization   │
│  supporting modules:      updater.ts (auto-update, Pending Update),          │
│                           logger.ts (file log + logs IPC), geoip.ts (offline │
│                           peer→country lookup), tray.ts, watchFolders.ts,    │
│                           clipboardWatch.ts, sizeFilterWatch.ts              │
└──────────────────────────────────┬────────────────────────────────────────---┘
                                   │ contextBridge (typed, promise-based)
┌──────────────────────────  Preload (sandboxed)  ─────────────────────────────┐
│  src/preload/index.ts   exposes window.api — the entire main↔renderer API    │
└──────────────────────────────────┬───────────────────────────────────────────┘
                                   │ window.api.*
┌───────────────────────────  Renderer (Chromium)  ────────────────────────────┐
│  React 19 + Redux Toolkit. No Node access, sandbox: true, strict CSP.        │
│  src/renderer/src/services/rpcApi.ts   RTK Query, ipcBaseQuery               │
│  src/renderer/src/features/*           slices + pure domain logic            │
│  src/renderer/src/components/*         UI                                    │
└──────────────────────────────────────────────────────────────────────────────┘
```

## Data flow: one polling cycle

1. A component calls `useGetTorrentsQuery({ profileId }, { pollingInterval })`.
2. RTK Query invokes `ipcBaseQuery`, which calls `window.api.rpc.invoke({ profileId,
   op: 'getTorrents' })` — ops are protocol-neutral intents, never daemon RPC names
   ([ADR-0004](adr/0004-protocol-adapters.md)).
3. Preload forwards over the `rpc:invoke` channel; `src/main/ipc.ts` resolves the cached
   adapter for that profile's Server Type (creating it with the decrypted password if
   needed) and dispatches the op.
4. The adapter speaks its daemon's native protocol (Transmission JSON-RPC with the 409
   session-id handshake, Deluge Web-UI JSON with cookie auth, qBittorrent WebUI with SID
   cookie), normalizes the reply into the shared `Torrent`/`TorrentDetail` shapes, and
   returns a discriminated `RpcResult` — `{ ok: true, data }` or `{ ok: false, error }`.
   Errors are *values*, never thrown across IPC. (For `getTorrentDetail`, `ipc.ts` also
   enriches each peer with an ISO country code via the bundled offline GeoIP database in
   `src/main/geoip.ts` — flags render in the UI, no peer IP ever leaves the machine.)
5. Components derive the visible list with pure functions from
   `src/renderer/src/features/torrents/derive.ts` (filter → sort), memoized on inputs.

## The shared contract (`src/shared/`)

The only code imported by all three worlds. It has no runtime dependencies on Electron,
Node, or React, which is what keeps it unit-testable and reusable:

- `types.ts` — `ServerProfile` (incl. the per-server `color` override), `ProfileInput`,
  `InvokeRequest` (profileId + neutral op + params), `RpcResult`/`RpcError`
  (discriminated by `kind`: network/timeout/auth/tls/http/rpc), `SortPref`, `AppPrefs`,
  and the `Api` interface implemented by the preload bridge.
- `transmission.ts` — Transmission 4.x RPC entities (`Torrent`, `TorrentDetail`,
  `SessionInfo`, …), the field lists requested from the daemon, and `tableToObjects`.

Adding an IPC capability means touching, in order: `Api` in `types.ts` → handler in
`src/main/ipc.ts` → bridge entry in `src/preload/index.ts`. The compiler enforces the
rest.

## State management

| State | Where | Why |
|---|---|---|
| Server data (torrents, session, stats) | RTK Query cache | Polling, request dedup, tag invalidation after mutations |
| Profiles, active profile, app prefs | `connection` slice, hydrated from main via `bootstrap()` thunk | Source of truth is electron-store in main; slice is a mirror |
| Selection, filters, sort, open dialogs, panel state | `ui` slice | Ephemeral view state |

Every RTK Query cache key includes `profileId`, and switching servers dispatches
`rpcApi.util.resetApiState()` — data from one daemon can never bleed into another's
view. This is also what keeps a future "multiple servers at once" mode a UI-only change.

Mutations invalidate the `Torrents` tag (and per-id `Torrent` tags), so the next poll
refetches; there is no optimistic patching in the MVP.

## Security posture

- `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false`; preload is
  compiled to CJS (`index.cjs`) because sandboxed preloads cannot be ESM.
- CSP has no `connect-src` — the renderer cannot make network requests at all.
- Passwords: encrypted with `safeStorage` (Keychain/DPAPI/libsecret) in
  `src/main/profiles.ts`; the renderer only ever sees `hasPassword: boolean`.
- Self-signed HTTPS trust is opt-in per profile (`allowSelfSignedCert`), applied as
  `rejectUnauthorized: false` for that profile's requests only.
- `window.open`/external links are denied and routed to `shell.openExternal`.

## OS integration

- `magnet:` links: `app.setAsDefaultProtocolClient` (packaged builds only), macOS
  `open-url`, Windows/Linux argv via the single-instance `second-instance` event.
- `.torrent` files: macOS `open-file`; file associations declared in
  `electron-builder.yml` (Linux gets the XDG `MimeType` desktop entry).
- Events arriving before React mounts are queued in `src/main/index.ts` and flushed
  when the renderer calls `window.api.rendererReady()`.

## Build and release

electron-vite drives three Vite builds (main = ESM, preload = CJS, renderer = SPA).
`npm run typecheck` covers the node and web tsconfig projects; `npm test` runs vitest
(RPC client against a real local HTTP server, pure derive logic). Tagging `v*` runs
`.github/workflows/release.yml`: a three-OS matrix building signed artifacts via
electron-builder and publishing a GitHub release that `electron-updater` consumes.

## Testing strategy

- **Unit (fast, hermetic):** `src/main/rpc/client.test.ts` spins up `node:http` servers
  to exercise the 409 handshake, auth, malformed JSON, and network failures;
  `derive.test.ts` covers filtering/sorting/sidebar math.
- **Live daemon:** `dev-daemon/` (Docker, Transmission 4.x, `dev`/`devpass`) — see its
  README for the one-time IPv6 bind fix.
- **Manual/CDP:** the app can be driven over the Chrome DevTools Protocol by launching
  `npx electron-vite dev -- --remote-debugging-port=9223`.
