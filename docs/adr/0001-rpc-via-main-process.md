# 0001 — Transmission RPC calls go through the Electron main process

Date: 2026-07-02
Status: accepted

## Context

The renderer uses Redux Toolkit + RTK Query for server state. RTK Query's default
`fetchBaseQuery` would issue HTTP requests directly from the renderer to the
Transmission daemon. Transmission's RPC endpoint sends no CORS headers, is commonly
protected by HTTP basic auth, and is frequently served over HTTPS with self-signed
certificates on home NAS boxes and seedboxes.

Direct renderer fetch therefore requires disabling `webSecurity` (or fragile request
interception) to bypass CORS, a global `certificate-error` override to accept
self-signed certificates for *all* renderer traffic, and holding plaintext credentials
in renderer memory where any compromised npm dependency could read them.

## Decision

All Transmission RPC traffic is performed by the main process. The renderer keeps RTK
Query, but with a custom `baseQuery` that forwards `{ profileId, method, arguments }`
over a `contextBridge` IPC channel. The main process owns:

- the HTTP client (Node `http`/`https`), including the `X-Transmission-Session-Id`
  409 handshake and retries;
- basic-auth credentials, stored encrypted with Electron `safeStorage` and never sent
  to the renderer;
- TLS trust decisions, scoped per Server Profile (`allowSelfSignedCert`).

The renderer runs with `contextIsolation: true`, `sandbox: true`, no `nodeIntegration`,
and a CSP without `connect-src`.

## Consequences

- No CORS or certificate workarounds; the app's web content stays fully locked down.
- Credentials never enter the renderer process.
- RPC traffic does not appear in the DevTools Network tab; debugging relies on the
  main-process request logger instead.
- A typed IPC contract (`src/shared/`) must be maintained between the three layers.

## Alternatives considered

**Direct renderer fetch** — fewer moving parts and Network-tab debugging, rejected for
the security posture described above. **Hybrid (fetch for polling, IPC for the rest)** —
rejected: two code paths for one protocol.
