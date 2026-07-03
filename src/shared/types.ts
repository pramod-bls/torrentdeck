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

/** Panel type identifiers for the flexible workspace (ADR-0002).
 * 'filters' existed in layout schema v1 and was retired in v2 (filters moved
 * into each Torrents panel) — migrations drop it. */
export type PanelTypeId =
  | 'torrent-list'
  | 'detail'
  | 'detail-general'
  | 'detail-files'
  | 'detail-peers'
  | 'detail-trackers'
  | 'stats'
  | 'speed-graph'

/** Coarse status groups used by list filtering (see derive.ts for the mapping). */
export type StatusFilter = 'all' | 'downloading' | 'seeding' | 'paused' | 'checking' | 'error'

/** Table-view column identifiers for Torrents panels. */
export type ColumnKey =
  | 'name'
  | 'size'
  | 'progress'
  | 'status'
  | 'downSpeed'
  | 'upSpeed'
  | 'ratio'
  | 'eta'
  | 'added'
  | 'labels'

export interface PanelFilters {
  status: StatusFilter
  tracker: string | null
  label: string | null
  search: string
}

/**
 * Per-instance configuration of a Torrents panel (ADR-0003): which servers it
 * shows ('default' follows the toolbar's Default Server), its own filters and
 * sort, and view preferences. Persisted inside the workspace layout.
 */
export interface TorrentsPanelConfig {
  servers: 'default' | string[]
  filters: PanelFilters
  sort: SortPref
  view: 'cards' | 'table'
  visibleColumns?: ColumnKey[]
  collapsedServers?: string[]
}

/** Per-instance configuration of a Speed Graph panel. */
export interface SpeedGraphConfig {
  server: 'default' | string
  windowSec: 60 | 300 | 900
}

/** Union of per-instance panel configs, discriminated by the item's `type`. */
export type WorkspaceItemConfig = TorrentsPanelConfig | SpeedGraphConfig

/** One panel instance placed on the workspace grid. `i` is a UUID, never an index. */
export interface WorkspaceItem {
  i: string
  type: PanelTypeId
  x: number
  y: number
  w: number
  h: number
  /** Present on panel types with per-instance config (torrent-list, speed-graph). */
  config?: WorkspaceItemConfig
}

/**
 * A user's panel arrangement, persisted per Server Profile. `version` guards
 * the schema: loaders must run migrations (or fall back to the default
 * layout) rather than trust unknown versions — see normalizeLayout().
 */
export interface WorkspaceLayout {
  version: number
  items: WorkspaceItem[]
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
  workspace: {
    get: (profileId: string) => Promise<WorkspaceLayout | null>
    set: (profileId: string, layout: WorkspaceLayout) => Promise<void>
  }
  pickTorrentFiles: () => Promise<TorrentFilePayload[]>
  readDroppedTorrents: (paths: string[]) => Promise<TorrentFilePayload[]>
  onOpenMagnet: (cb: (url: string) => void) => () => void
  onOpenTorrentFiles: (cb: (files: TorrentFilePayload[]) => void) => () => void
}
