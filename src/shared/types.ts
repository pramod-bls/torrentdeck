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
  | 'maxSeeders'
  | 'availRatio'

export interface SortPref {
  key: SortKey
  desc: boolean
}

/**
 * Which daemon protocol a profile speaks. The main process picks an adapter
 * from this (see src/main/rpc/adapters); the renderer stays protocol-agnostic
 * and only branches on Capabilities. Defaults to 'transmission' for profiles
 * saved before this field existed.
 */
export type ServerType = 'transmission' | 'deluge' | 'qbittorrent'

/**
 * What a given server can actually do, so the UI can hide controls the daemon
 * doesn't support rather than letting them fail. Reported by the active
 * adapter (some flags are probed live — e.g. Deluge's Label plugin).
 */
export interface Capabilities {
  bandwidthGroups: boolean
  altSpeedScheduler: boolean
  blocklist: boolean
  sequentialDownload: boolean
  perPieceAvailability: boolean
  perTrackerSwarm: boolean
  labels: boolean
  renamePath: boolean
  portTest: boolean
}

/**
 * A saved daemon connection ("Server Profile" in CONTEXT.md) as seen by the
 * renderer. Deliberately excludes the password — the renderer only learns
 * `hasPassword`; the secret lives safeStorage-encrypted in the main process.
 */
export interface ServerProfile {
  id: string
  name: string
  serverType: ServerType
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
  serverType: ServerType
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

/**
 * Intent-level operations the renderer asks of a server, independent of which
 * daemon protocol backs it. The main process routes each op to the active
 * profile's adapter, which returns already-normalized shared types (ADR-0004).
 */
export type TorrentOp =
  | 'getCapabilities'
  | 'getSession'
  | 'setSession'
  | 'getSessionStats'
  | 'portTest'
  | 'blocklistUpdate'
  | 'getGroups'
  | 'setGroup'
  | 'freeSpace'
  | 'getTorrents'
  | 'getTorrentDetail'
  | 'torrentAction'
  | 'queueMove'
  | 'removeTorrent'
  | 'addTorrent'
  | 'setTorrent'
  | 'renamePath'
  | 'setLocation'

/** Renderer→main payload for a single intent-level operation. */
export interface InvokeRequest {
  profileId: string
  op: TorrentOp
  params?: Record<string, unknown>
}

/** Normalized result of an add-torrent op, keyed by infohash regardless of daemon. */
export interface AddResult {
  added?: { id: string; name: string }
  duplicate?: { id: string; name: string }
}

export interface AppPrefs {
  theme: 'system' | 'light' | 'dark'
  pollingIntervalMs: number
  notifyOnComplete: boolean
  /** When true, closing the window hides it to the tray instead of quitting. */
  closeToTray: boolean
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
  | 'detail-pieces'
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
  | 'seeders'
  | 'leechers'
  | 'avail'
  | 'queue'

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
  /** user-resized table column widths in px, keyed by ColumnKey */
  columnWidths?: Record<string, number>
  collapsedServers?: string[]
}

/** Per-instance configuration of a Speed Graph panel. */
export interface SpeedGraphConfig {
  server: 'default' | string
  windowSec: 60 | 300 | 900
}

/** Per-instance configuration of a Session Stats panel: which server it reads. */
export interface StatsPanelConfig {
  server: 'default' | string
}

/** Union of per-instance panel configs, discriminated by the item's `type`. */
export type WorkspaceItemConfig = TorrentsPanelConfig | SpeedGraphConfig | StatsPanelConfig

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
  invoke: <T = unknown>(req: InvokeRequest) => Promise<RpcResult<T>>
  testConnection: (input: ProfileInput) => Promise<RpcResult<{ version: string }>>
  profiles: {
    list: () => Promise<ServerProfile[]>
    save: (input: ProfileInput) => Promise<ServerProfile>
    remove: (id: string) => Promise<void>
    setSort: (id: string, sort: SortPref) => Promise<void>
  }
  prefs: {
    get: () => Promise<AppPrefs>
    set: (prefs: Partial<AppPrefs>) => Promise<AppPrefs>
  }
  /** The single, app-wide panel workspace (no longer per-server). */
  workspace: {
    get: () => Promise<WorkspaceLayout | null>
    set: (layout: WorkspaceLayout) => Promise<void>
  }
  pickTorrentFiles: () => Promise<TorrentFilePayload[]>
  readDroppedTorrents: (paths: string[]) => Promise<TorrentFilePayload[]>
  readClipboardText: () => Promise<string>
  focusWindow: () => Promise<void>
  setTraySpeeds: (down: number, up: number) => void
  onOpenMagnet: (cb: (url: string) => void) => () => void
  onOpenTorrentFiles: (cb: (files: TorrentFilePayload[]) => void) => () => void
}
