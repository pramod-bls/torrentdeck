/**
 * Pure qBittorrent→canonical mappers (ADR-0004). Kept free of I/O so the tricky
 * bits — the many `state` strings → TorrentStatus, tags → labels, swarm/
 * availability derivation, infohash as id — are directly unit-testable.
 *
 * qBittorrent WebUI API v2 `torrents/info` gives progress as 0–1 already, eta
 * in seconds (8640000 = "infinity"), tags as a comma-joined string, and swarm
 * counts as num_complete/num_incomplete (-1 when unknown).
 */
import { TorrentStatus, type Torrent, type TorrentStatusValue } from '@shared/transmission'

export type QbitTorrent = Record<string, unknown>

const QBIT_ETA_INFINITY = 8640000

function n(v: unknown, fallback = 0): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback
}
function s(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback
}

export function mapState(state: string): TorrentStatusValue {
  switch (state) {
    case 'downloading':
    case 'forcedDL':
    case 'metaDL':
    case 'stalledDL':
      return TorrentStatus.Downloading
    case 'queuedDL':
      return TorrentStatus.DownloadWait
    case 'uploading':
    case 'forcedUP':
    case 'stalledUP':
      return TorrentStatus.Seeding
    case 'queuedUP':
      return TorrentStatus.SeedWait
    case 'checkingDL':
    case 'checkingUP':
    case 'checkingResumeData':
    case 'allocating':
    case 'moving':
      return TorrentStatus.Checking
    case 'pausedDL':
    case 'pausedUP':
    case 'stoppedDL':
    case 'stoppedUP':
    case 'error':
    case 'missingFiles':
    default:
      return TorrentStatus.Stopped
  }
}

export function isErrorState(state: string): boolean {
  return state === 'error' || state === 'missingFiles'
}

/** Availability as Transmission means it: fraction of missing data peers can
 * supply, 1 when complete. qBittorrent's `availability` is distributed copies
 * (like Deluge); unknown (-1) reads as "don't alarm" → 1. */
export function availabilityRatio(leftUntilDone: number, availability: number): number {
  if (leftUntilDone <= 0) return 1
  if (availability < 0) return 1
  return Math.min(1, Math.max(0, availability))
}

export function tagsToLabels(tags: unknown): string[] {
  return s(tags)
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
}

/**
 * Build a Transmission-style base64 piece bitfield (MSB-first, bit set = piece
 * complete) from qBittorrent's `torrents/pieceStates` array (0=not downloaded,
 * 1=downloading, 2=downloaded). Lets the pieces map render "have" state; qBit
 * exposes no per-piece peer availability, so the availability overlay stays off.
 */
export function pieceStatesToBitfield(states: number[]): string {
  const bytes = new Uint8Array(Math.ceil(states.length / 8))
  for (let i = 0; i < states.length; i++) {
    if (states[i] === 2) bytes[i >> 3] |= 0x80 >> (i & 7)
  }
  return Buffer.from(bytes).toString('base64')
}

export function normalizeTorrent(d: QbitTorrent): Torrent {
  const hash = s(d.hash)
  const state = s(d.state, 'stoppedDL')
  const leftUntilDone = n(d.amount_left)
  const numSeeds = n(d.num_seeds)
  const numLeechs = n(d.num_leechs)
  const numComplete = d.num_complete != null ? n(d.num_complete, -1) : -1
  const numIncomplete = d.num_incomplete != null ? n(d.num_incomplete, -1) : -1
  const eta = n(d.eta)
  const tracker = s(d.tracker)
  return {
    id: hash,
    hashString: hash,
    name: s(d.name, hash),
    status: mapState(state),
    totalSize: n(d.total_size, n(d.size)),
    sizeWhenDone: n(d.size, n(d.total_size)),
    leftUntilDone,
    percentDone: Math.min(1, Math.max(0, n(d.progress))),
    recheckProgress: 0,
    rateDownload: n(d.dlspeed),
    rateUpload: n(d.upspeed),
    uploadRatio: n(d.ratio),
    uploadedEver: n(d.uploaded),
    eta: state === 'downloading' || state === 'forcedDL' || state === 'metaDL' || state === 'stalledDL'
      ? eta > 0 && eta < QBIT_ETA_INFINITY
        ? eta
        : -1
      : -1,
    addedDate: Math.floor(n(d.added_on)),
    // qBittorrent `priority` is the 1-based queue position (0 = not queued).
    queuePosition: n(d.priority) > 0 ? n(d.priority) - 1 : 0,
    error: isErrorState(state) ? 1 : 0,
    errorString: isErrorState(state) ? 'Error' : '',
    labels: tagsToLabels(d.tags),
    downloadDir: s(d.save_path) || s(d.download_path),
    peersConnected: numSeeds + numLeechs,
    peersSendingToUs: numSeeds,
    peersGettingFromUs: numLeechs,
    isFinished: n(d.progress) >= 1,
    metadataPercentComplete: state === 'metaDL' ? 0 : 1,
    trackers: tracker ? [{ announce: tracker, id: 0, scrape: '', sitename: '', tier: 0 }] : [],
    maxSeeders: numComplete,
    maxLeechers: numIncomplete,
    desiredAvailable: 0,
    availRatio: availabilityRatio(leftUntilDone, n(d.availability, -1))
  }
}
