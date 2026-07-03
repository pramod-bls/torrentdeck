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
  id: number
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
}

/** RPC fields requested for the list. `trackerStats` is heavy and is stripped
 * to maxSeeders/maxLeechers in the transform before entering the cache. */
export const TORRENT_LIST_FIELDS: (keyof Torrent | 'trackerStats')[] = [
  'trackerStats',
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
  files: TorrentFile[]
  fileStats: FileStat[]
  peers: Peer[]
  trackerStats: TrackerStat[]
}

export const TORRENT_DETAIL_FIELDS: (keyof TorrentDetail | 'trackerStats')[] = [
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
  'files',
  'fileStats',
  'peers',
  'trackerStats'
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
  'peer-limit-global': number
  'peer-limit-per-torrent': number
  'peer-port': number
  'peer-port-random-on-start': boolean
  'port-forwarding-enabled': boolean
  encryption: 'required' | 'preferred' | 'tolerated'
  'start-added-torrents': boolean
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
