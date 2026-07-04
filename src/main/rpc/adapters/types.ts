/**
 * Protocol-neutral daemon contract (ADR-0004). Every server the app talks to
 * — Transmission, Deluge — is reached through a `TorrentClient` implementation
 * that speaks the daemon's native RPC and returns ALREADY-NORMALIZED shared
 * types. This is the seam that lets one renderer drive multiple daemons: the
 * renderer issues intent-level ops (see `TorrentOp`), the main process routes
 * each to the active profile's adapter, and no Transmission-specific wire shape
 * leaks past this boundary.
 *
 * Torrent identity is the infohash STRING everywhere here — Transmission's
 * numeric id never crosses this line (its RPC accepts hashes in `ids`).
 *
 * Methods return `RpcResult` rather than throwing, matching the low-level
 * `TransmissionClient.call` contract: transport/auth/rpc errors propagate as
 * values, and normalization runs only on success.
 */
import type { AddResult, Capabilities, RpcResult } from '@shared/types'
import type {
  BandwidthGroup,
  SessionInfo,
  SessionStats,
  Torrent,
  TorrentDetail
} from '@shared/transmission'

export type TorrentActionKind =
  | 'torrent-start'
  | 'torrent-start-now'
  | 'torrent-stop'
  | 'torrent-verify'
  | 'torrent-reannounce'

export type QueueDirection =
  | 'queue-move-top'
  | 'queue-move-up'
  | 'queue-move-down'
  | 'queue-move-bottom'

export interface AddTorrentParams {
  magnet?: string
  metainfoBase64?: string
  downloadDir?: string
  paused?: boolean
  unwantedIndices?: number[]
  labels?: string[]
  /** Download pieces in order (gated by the sequentialDownload capability). */
  sequentialDownload?: boolean
  /** Place the torrent at the front of the queue after adding. */
  addToTopOfQueue?: boolean
  /** Skip the initial recheck of existing data (gated by skipHashCheck; qBittorrent). */
  skipHashCheck?: boolean
  /** Size Filter threshold (bytes) injected by main from the profile. Adapters
   *  that can filter before adding (Deluge prefetch) use it; others rely on the
   *  post-add watcher. 0/undefined = Off. */
  sizeThresholdBytes?: number
}

export type { AddResult } from '@shared/types'

export interface RenameResult {
  id: string
  path: string
  name: string
}

export interface TorrentClient {
  /** Static + live-probed feature flags for this server. */
  getCapabilities(): Promise<RpcResult<Capabilities>>
  /** Cheap reachability/auth check used by the profile dialog. */
  test(): Promise<RpcResult<{ version: string }>>

  getSession(): Promise<RpcResult<SessionInfo>>
  setSession(fields: Partial<SessionInfo>): Promise<RpcResult<unknown>>
  getSessionStats(): Promise<RpcResult<SessionStats>>

  getTorrents(): Promise<RpcResult<Torrent[]>>
  getTorrentDetail(id: string): Promise<RpcResult<TorrentDetail | undefined>>

  /** An empty `ids` array means "all torrents" (used by the tray). */
  torrentAction(action: TorrentActionKind, ids: string[]): Promise<RpcResult<unknown>>
  queueMove(direction: QueueDirection, ids: string[]): Promise<RpcResult<unknown>>
  removeTorrent(ids: string[], deleteData: boolean): Promise<RpcResult<unknown>>
  addTorrent(params: AddTorrentParams): Promise<RpcResult<AddResult>>
  setTorrent(ids: string[], fields: Record<string, unknown>): Promise<RpcResult<unknown>>
  renamePath(id: string, path: string, name: string): Promise<RpcResult<RenameResult>>
  setLocation(ids: string[], location: string, move: boolean): Promise<RpcResult<unknown>>

  freeSpace(path: string): Promise<RpcResult<{ path: string; 'size-bytes': number }>>

  // Capability-gated; adapters that lack the feature return an 'rpc' error.
  getGroups(): Promise<RpcResult<BandwidthGroup[]>>
  setGroup(group: Partial<BandwidthGroup> & { name: string }): Promise<RpcResult<unknown>>
  blocklistUpdate(): Promise<RpcResult<{ 'blocklist-size': number }>>
  portTest(): Promise<RpcResult<{ 'port-is-open': boolean }>>
}
