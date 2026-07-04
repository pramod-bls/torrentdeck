/** Transmission 4.x RPC entities (rpc-version >= 17). */

export const TorrentStatus = {
  Stopped: 0,
  CheckWait: 1,
  Checking: 2,
  DownloadWait: 3,
  Downloading: 4,
  SeedWait: 5,
  Seeding: 6
} as const
export type TorrentStatusValue = (typeof TorrentStatus)[keyof typeof TorrentStatus]

export interface TrackerRef {
  announce: string
  id: number
  scrape: string
  sitename: string
  tier: number
}

export interface Torrent {
  /** Canonical identity = infohash string (ADR-0004), uniform across daemons.
   * For Transmission this is `hashString`; its numeric id never leaves the
   * main process (its RPC accepts hashes wherever it accepts numeric ids). */
  id: string
  name: string
  status: TorrentStatusValue
  hashString: string
  totalSize: number
  sizeWhenDone: number
  leftUntilDone: number
  percentDone: number
  recheckProgress: number
  rateDownload: number
  rateUpload: number
  uploadRatio: number
  uploadedEver: number
  eta: number
  addedDate: number
  queuePosition: number
  error: number
  errorString: string
  labels: string[]
  downloadDir: string
  peersConnected: number
  peersSendingToUs: number
  peersGettingFromUs: number
  isFinished: boolean
  metadataPercentComplete: number
  trackers: TrackerRef[]
  /** Best seeder/leecher counts across trackers, derived client-side from
   * trackerStats (see deriveSwarm); -1 = unknown/no announce yet. */
  maxSeeders: number
  maxLeechers: number
  /** Bytes of still-wanted data available from connected peers (RPC field). */
  desiredAvailable: number
  /** Derived: fraction of missing data available right now (1 when complete). */
  availRatio: number
}

/** RPC fields requested for the list. `trackerStats` is heavy and is stripped
 * to maxSeeders/maxLeechers in the transform before entering the cache. */
export const TORRENT_LIST_FIELDS: (keyof Torrent | 'trackerStats')[] = [
  'trackerStats',
  'desiredAvailable',
  'id',
  'name',
  'status',
  'hashString',
  'totalSize',
  'sizeWhenDone',
  'leftUntilDone',
  'percentDone',
  'recheckProgress',
  'rateDownload',
  'rateUpload',
  'uploadRatio',
  'uploadedEver',
  'eta',
  'addedDate',
  'queuePosition',
  'error',
  'errorString',
  'labels',
  'downloadDir',
  'peersConnected',
  'peersSendingToUs',
  'peersGettingFromUs',
  'isFinished',
  'metadataPercentComplete',
  'trackers'
]

export interface TorrentFile {
  name: string
  length: number
  bytesCompleted: number
}

export interface FileStat {
  bytesCompleted: number
  wanted: boolean
  priority: -1 | 0 | 1
}

export interface Peer {
  address: string
  clientName: string
  flagStr: string
  port: number
  progress: number
  rateToClient: number
  rateToPeer: number
  isEncrypted: boolean
}

export interface TrackerStat {
  id: number
  announce: string
  host: string
  sitename: string
  tier: number
  lastAnnounceResult: string
  lastAnnounceSucceeded: boolean
  lastAnnounceTime: number
  nextAnnounceTime: number
  seederCount: number
  leecherCount: number
  downloadCount: number
}

export interface TorrentDetail extends Torrent {
  comment: string
  creator: string
  dateCreated: number
  doneDate: number
  activityDate: number
  startDate: number
  pieceCount: number
  pieceSize: number
  downloadedEver: number
  corruptEver: number
  magnetLink: string
  isPrivate: boolean
  /** base64 bitfield, one bit per piece (MSB-first), set = piece verified locally */
  pieces: string
  /** Per-piece connected-peer counts; -1 = we already have the piece (4.0+/rpc17+). */
  availability: number[]
  files: TorrentFile[]
  fileStats: FileStat[]
  peers: Peer[]
  trackerStats: TrackerStat[]
  // Per-torrent limits (torrent-get/torrent-set)
  downloadLimited: boolean
  downloadLimit: number
  uploadLimited: boolean
  uploadLimit: number
  /** 0 = use global ratio, 1 = use this torrent's seedRatioLimit, 2 = seed forever */
  seedRatioMode: 0 | 1 | 2
  seedRatioLimit: number
  honorsSessionLimits: boolean
  bandwidthPriority: -1 | 0 | 1
  'peer-limit': number
  /** Bandwidth group name, '' = none. */
  group: string
  /** Download pieces in order (4.1+/rpc17+ via rpc-version >= 18). */
  sequentialDownload: boolean
}

export const TORRENT_DETAIL_FIELDS: (keyof TorrentDetail | 'trackerStats' | 'sequential_download')[] = [
  ...TORRENT_LIST_FIELDS,
  'comment',
  'creator',
  'dateCreated',
  'doneDate',
  'activityDate',
  'startDate',
  'pieceCount',
  'pieceSize',
  'downloadedEver',
  'corruptEver',
  'magnetLink',
  'isPrivate',
  'pieces',
  'availability',
  'files',
  'fileStats',
  'peers',
  'trackerStats',
  'downloadLimited',
  'downloadLimit',
  'uploadLimited',
  'uploadLimit',
  'seedRatioMode',
  'seedRatioLimit',
  'honorsSessionLimits',
  'bandwidthPriority',
  'peer-limit',
  'group',
  // Sequential download: set as camelCase, returned as snake_case — request
  // both spellings so the daemon answers regardless, normalize in the transform.
  'sequentialDownload',
  'sequential_download'
]

export interface SessionInfo {
  version: string
  'rpc-version': number
  'download-dir': string
  'speed-limit-down': number
  'speed-limit-down-enabled': boolean
  'speed-limit-up': number
  'speed-limit-up-enabled': boolean
  'alt-speed-down': number
  'alt-speed-up': number
  'alt-speed-enabled': boolean
  'seedRatioLimit': number
  'seedRatioLimited': boolean
  // Extended seeding limits (canonical = Transmission field names where they exist)
  'idle-seeding-limit': number // minutes
  'idle-seeding-limit-enabled': boolean
  /** Total seeding time before stopping, minutes (qBittorrent). */
  'seed-time-limit'?: number
  'seed-time-limit-enabled'?: boolean
  /** What to do when a seeding limit is reached (qBittorrent, Deluge). */
  'seed-limit-action'?: 'pause' | 'remove'
  'peer-limit-global': number
  'peer-limit-per-torrent': number
  'peer-port': number
  'peer-port-random-on-start': boolean
  'port-forwarding-enabled': boolean
  // Privacy & network (canonical = Transmission field names; other adapters normalize)
  'dht-enabled': boolean
  'pex-enabled': boolean
  'lpd-enabled': boolean
  'utp-enabled': boolean
  /** Deluge/qBittorrent only (Transmission has no anonymous mode). */
  'anonymous-mode'?: boolean
  encryption: 'required' | 'preferred' | 'tolerated'
  'start-added-torrents': boolean
  // Alt-speed schedule
  'alt-speed-time-enabled': boolean
  /** minutes past local midnight */
  'alt-speed-time-begin': number
  'alt-speed-time-end': number
  /** bitfield of weekdays; bit 0 = Sunday … bit 6 = Saturday; 127 = every day */
  'alt-speed-time-day': number
  // Blocklist
  'blocklist-enabled': boolean
  'blocklist-url': string
  'blocklist-size': number
}

/** A bandwidth group: named speed-limit pool torrents can be assigned to. */
export interface BandwidthGroup {
  name: string
  honorsSessionLimits: boolean
  'speed-limit-down': number
  'speed-limit-down-enabled': boolean
  'speed-limit-up': number
  'speed-limit-up-enabled': boolean
}

export interface SessionStats {
  activeTorrentCount: number
  pausedTorrentCount: number
  torrentCount: number
  downloadSpeed: number
  uploadSpeed: number
  'cumulative-stats': { uploadedBytes: number; downloadedBytes: number; secondsActive: number }
  'current-stats': { uploadedBytes: number; downloadedBytes: number; secondsActive: number }
}

/**
 * Fraction of still-missing data that connected peers can currently supply.
 * 1 for complete torrents (nothing missing); clamped — daemons can briefly
 * report desiredAvailable > leftUntilDone during piece churn.
 */
export function deriveAvailRatio(leftUntilDone: number, desiredAvailable: number): number {
  if (leftUntilDone <= 0) return 1
  return Math.min(1, Math.max(0, desiredAvailable / leftUntilDone))
}

/** Best-across-trackers swarm counts; -1 when no tracker has answered yet. */
export function deriveSwarm(trackerStats?: TrackerStat[]): {
  maxSeeders: number
  maxLeechers: number
} {
  let maxSeeders = -1
  let maxLeechers = -1
  for (const t of trackerStats ?? []) {
    maxSeeders = Math.max(maxSeeders, t.seederCount)
    maxLeechers = Math.max(maxLeechers, t.leecherCount)
  }
  return { maxSeeders, maxLeechers }
}

/** Convert torrent-get `format: "table"` rows (first row = field names) to objects. */
export function tableToObjects<T>(rows: unknown[][]): T[] {
  if (!rows.length) return []
  const [keys, ...values] = rows as [string[], ...unknown[][]]
  return values.map((row) => {
    const obj: Record<string, unknown> = {}
    keys.forEach((k, i) => (obj[k] = row[i]))
    return obj as T
  })
}
