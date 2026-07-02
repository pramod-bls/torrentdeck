/**
 * Shared contract between the main process, preload bridge, and renderer.
 *
 * This module (and `transmission.ts`) is the ONLY code imported by all three
 * Electron worlds, so it must stay free of Electron/Node/React imports.
 * Adding an IPC capability: extend `Api` here, implement the handler in
 * `src/main/ipc.ts`, expose it in `src/preload/index.ts` — the compiler
 * enforces the rest.
 */

/** Torrent-list sort dimensions; values are `Torrent` field names (see derive.ts comparators). */
export type SortKey =
  | 'name'
  | 'totalSize'
  | 'percentDone'
  | 'status'
  | 'rateDownload'
  | 'rateUpload'
  | 'uploadRatio'
  | 'eta'
  | 'addedDate'
  | 'queuePosition'

export interface SortPref {
  key: SortKey
  desc: boolean
}

/**
 * A saved daemon connection ("Server Profile" in CONTEXT.md) as seen by the
 * renderer. Deliberately excludes the password — the renderer only learns
 * `hasPassword`; the secret lives safeStorage-encrypted in the main process.
 */
export interface ServerProfile {
  id: string
  name: string
  host: string
  port: number
  useTls: boolean
  allowSelfSignedCert: boolean
  rpcPath: string
  username: string
  hasPassword: boolean
  sort?: SortPref
}

/** Renderer→main payload for creating (`id` absent) or updating a profile. */
export interface ProfileInput {
  id?: string
  name: string
  host: string
  port: number
  useTls: boolean
  allowSelfSignedCert: boolean
  rpcPath: string
  username: string
  /** New password to store; undefined = keep existing, empty string = clear */
  password?: string
}

/**
 * Failure classification for RPC calls. The UI branches on this:
 * `auth`/`tls` are actionable by the user (fix credentials / trust the cert),
 * `network`/`timeout` are transient, `rpc` is a daemon-reported method error.
 */
export type RpcErrorKind = 'network' | 'timeout' | 'auth' | 'tls' | 'http' | 'rpc' | 'unknown'

export interface RpcError {
  kind: RpcErrorKind
  message: string
  status?: number
}

/**
 * Every RPC crosses the IPC boundary as this discriminated union — errors are
 * values, never exceptions, because thrown errors lose their shape (and stack
 * safety) when serialized across `ipcRenderer.invoke`.
 */
export type RpcResult<T = unknown> = { ok: true; data: T } | { ok: false; error: RpcError }

export interface RpcRequest {
  profileId: string
  method: string
  arguments?: Record<string, unknown>
}

export interface AppPrefs {
  theme: 'system' | 'light' | 'dark'
  pollingIntervalMs: number
}

export interface TorrentFilePayload {
  name: string
  base64: string
}

/**
 * The renderer-facing API implemented by the preload bridge and exposed as
 * `window.api`. Extending it: add the member here, handle the channel in
 * `src/main/ipc.ts`, forward it in `src/preload/index.ts`.
 */
export interface Api {
  rpc: <T = unknown>(req: RpcRequest) => Promise<RpcResult<T>>
  testConnection: (input: ProfileInput) => Promise<RpcResult<{ version: string }>>
  profiles: {
    list: () => Promise<ServerProfile[]>
    save: (input: ProfileInput) => Promise<ServerProfile>
    remove: (id: string) => Promise<void>
    getActiveId: () => Promise<string | null>
    setActiveId: (id: string | null) => Promise<void>
    setSort: (id: string, sort: SortPref) => Promise<void>
  }
  prefs: {
    get: () => Promise<AppPrefs>
    set: (prefs: Partial<AppPrefs>) => Promise<AppPrefs>
  }
  pickTorrentFiles: () => Promise<TorrentFilePayload[]>
  readDroppedTorrents: (paths: string[]) => Promise<TorrentFilePayload[]>
  onOpenMagnet: (cb: (url: string) => void) => () => void
  onOpenTorrentFiles: (cb: (files: TorrentFilePayload[]) => void) => () => void
}
