/**
 * Pure Deluge→canonical mappers (ADR-0004). Kept free of I/O so the tricky
 * bits — state-string → TorrentStatus enum, 0–100 → 0–1 progress, swarm and
 * availability derivation, infohash as id — are directly unit-testable.
 *
 * Deluge `state` is one of: Downloading, Seeding, Paused, Checking, Queued,
 * Error, Allocating, Moving. Transmission has no single "Queued" state, so a
 * queued torrent is classed as download- or seed-wait by its progress.
 */
import { TorrentStatus, type Torrent, type TorrentStatusValue } from '@shared/transmission'

/** Loose shape of a Deluge torrent status dict (only the keys we read). */
export type DelugeStatus = Record<string, unknown>

function n(v: unknown, fallback = 0): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback
}
function s(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback
}

export function mapState(state: string, progressFraction: number): TorrentStatusValue {
  switch (state) {
    case 'Downloading':
      return TorrentStatus.Downloading
    case 'Seeding':
      return TorrentStatus.Seeding
    case 'Checking':
    case 'Allocating':
    case 'Moving':
      return TorrentStatus.Checking
    case 'Queued':
      return progressFraction >= 1 ? TorrentStatus.SeedWait : TorrentStatus.DownloadWait
    case 'Paused':
    case 'Error':
    default:
      return TorrentStatus.Stopped
  }
}

export interface TrackerLike {
  url?: string
  tier?: number
}

export function mapTrackers(trackers: unknown): Torrent['trackers'] {
  if (!Array.isArray(trackers)) return []
  return trackers.map((t: TrackerLike, i) => ({
    announce: t?.url ?? '',
    id: i,
    scrape: '',
    sitename: '',
    tier: n(t?.tier)
  }))
}

/**
 * Availability as Transmission means it (fraction of still-missing data peers
 * can supply, 1 when complete). Deluge exposes only `distributed_copies` — the
 * number of full copies in the swarm — so ≥1 copy reads as fully available.
 */
export function availabilityFromCopies(leftUntilDone: number, distributedCopies: number): number {
  if (leftUntilDone <= 0) return 1
  return Math.min(1, Math.max(0, distributedCopies))
}

/** Map one (hash, status-dict) pair to a canonical list Torrent. */
export function normalizeTorrent(hash: string, d: DelugeStatus): Torrent {
  const state = s(d.state, 'Paused')
  const progress = n(d.progress) / 100
  const isError = state === 'Error'
  const leftUntilDone = n(d.total_remaining)
  const numPeers = n(d.num_peers)
  const numSeeds = n(d.num_seeds)
  const totalSeeds = d.total_seeds != null ? n(d.total_seeds) : -1
  const totalPeers = d.total_peers != null ? n(d.total_peers) : -1
  const label = s(d.label)
  return {
    id: hash,
    hashString: hash,
    name: s(d.name, hash),
    status: mapState(state, progress),
    totalSize: n(d.total_size),
    sizeWhenDone: n(d.total_wanted, n(d.total_size)),
    leftUntilDone,
    percentDone: Math.min(1, Math.max(0, progress)),
    recheckProgress: state === 'Checking' ? Math.min(1, Math.max(0, progress)) : 0,
    rateDownload: n(d.download_payload_rate),
    rateUpload: n(d.upload_payload_rate),
    uploadRatio: n(d.ratio),
    uploadedEver: n(d.total_uploaded),
    // Deluge eta is 0 when not actively downloading; Transmission uses -1 = unknown.
    eta: state === 'Downloading' && n(d.eta) > 0 ? n(d.eta) : -1,
    addedDate: Math.floor(n(d.time_added)),
    queuePosition: n(d.queue) >= 0 ? n(d.queue) : 0,
    error: isError ? 1 : 0,
    errorString: isError ? s(d.tracker_status, 'Error') : '',
    labels: label ? [label] : [],
    downloadDir: s(d.save_path) || s(d.download_location),
    peersConnected: numPeers,
    peersSendingToUs: numSeeds,
    peersGettingFromUs: Math.max(0, numPeers - numSeeds),
    isFinished: d.is_finished === true,
    metadataPercentComplete: 1,
    trackers: mapTrackers(d.trackers),
    maxSeeders: totalSeeds,
    maxLeechers: totalSeeds >= 0 && totalPeers >= 0 ? Math.max(0, totalPeers - totalSeeds) : -1,
    desiredAvailable: 0,
    availRatio: availabilityFromCopies(leftUntilDone, n(d.distributed_copies))
  }
}

/** Fields requested for the list (a superset is harmless; Deluge drops unknown keys). */
export const DELUGE_LIST_KEYS = [
  'name',
  'state',
  'progress',
  'hash',
  'total_size',
  'total_wanted',
  'total_remaining',
  'download_payload_rate',
  'upload_payload_rate',
  'ratio',
  'eta',
  'time_added',
  'queue',
  'total_uploaded',
  'num_peers',
  'num_seeds',
  'total_peers',
  'total_seeds',
  'is_finished',
  'save_path',
  'download_location',
  'distributed_copies',
  'trackers',
  'tracker_status',
  'label'
]
