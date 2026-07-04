import { describe, expect, it } from 'vitest'
import { TorrentStatus } from '@shared/transmission'
import {
  availabilityRatio,
  mapState,
  normalizeTorrent,
  pieceStatesToBitfield,
  tagsToLabels
} from './normalize'

describe('mapState', () => {
  it('maps the qBittorrent state strings', () => {
    expect(mapState('downloading')).toBe(TorrentStatus.Downloading)
    expect(mapState('stalledDL')).toBe(TorrentStatus.Downloading)
    expect(mapState('metaDL')).toBe(TorrentStatus.Downloading)
    expect(mapState('queuedDL')).toBe(TorrentStatus.DownloadWait)
    expect(mapState('uploading')).toBe(TorrentStatus.Seeding)
    expect(mapState('stalledUP')).toBe(TorrentStatus.Seeding)
    expect(mapState('queuedUP')).toBe(TorrentStatus.SeedWait)
    expect(mapState('checkingDL')).toBe(TorrentStatus.Checking)
    expect(mapState('moving')).toBe(TorrentStatus.Checking)
    expect(mapState('pausedUP')).toBe(TorrentStatus.Stopped)
    expect(mapState('stoppedDL')).toBe(TorrentStatus.Stopped)
    expect(mapState('error')).toBe(TorrentStatus.Stopped)
  })
})

describe('tagsToLabels', () => {
  it('splits the comma-joined tag string', () => {
    expect(tagsToLabels('isos, linux')).toEqual(['isos', 'linux'])
    expect(tagsToLabels('')).toEqual([])
    expect(tagsToLabels(undefined)).toEqual([])
  })
})

describe('availabilityRatio', () => {
  it('is 1 when complete or unknown, clamps otherwise', () => {
    expect(availabilityRatio(0, -1)).toBe(1)
    expect(availabilityRatio(500, -1)).toBe(1) // unknown → no alarm
    expect(availabilityRatio(500, 2.4)).toBe(1)
    expect(availabilityRatio(500, 0.3)).toBeCloseTo(0.3)
  })
})

describe('pieceStatesToBitfield', () => {
  it('sets a bit (MSB-first) only for downloaded pieces (state 2)', () => {
    // pieces 0 and 2 downloaded → 1010_0000 = 0xA0
    expect(pieceStatesToBitfield([2, 0, 2, 1])).toBe(Buffer.from([0xa0]).toString('base64'))
    expect(pieceStatesToBitfield([])).toBe('')
  })
})

describe('normalizeTorrent', () => {
  const base = {
    hash: 'abc123',
    name: 'Ubuntu ISO',
    state: 'downloading',
    progress: 0.5,
    total_size: 2000,
    size: 1800,
    amount_left: 900,
    dlspeed: 1024,
    upspeed: 128,
    ratio: 0.4,
    uploaded: 720,
    eta: 600,
    added_on: 1_700_000_000,
    priority: 3,
    tags: 'isos, linux',
    save_path: '/downloads',
    num_seeds: 4,
    num_leechs: 6,
    num_complete: 30,
    num_incomplete: 12,
    availability: 1.8,
    tracker: 'http://tr.example/announce'
  }

  it('uses the infohash as id and keeps progress 0–1', () => {
    const t = normalizeTorrent(base)
    expect(t.id).toBe('abc123')
    expect(t.hashString).toBe('abc123')
    expect(t.percentDone).toBe(0.5)
    expect(t.status).toBe(TorrentStatus.Downloading)
  })

  it('maps tags→labels, swarm, queue (1-based→0-based), and primary tracker', () => {
    const t = normalizeTorrent(base)
    expect(t.labels).toEqual(['isos', 'linux'])
    expect(t.maxSeeders).toBe(30)
    expect(t.maxLeechers).toBe(12)
    expect(t.queuePosition).toBe(2)
    expect(t.trackers[0].announce).toBe('http://tr.example/announce')
    expect(t.eta).toBe(600)
  })

  it('treats the infinity eta and non-downloading states as unknown eta', () => {
    expect(normalizeTorrent({ ...base, eta: 8640000 }).eta).toBe(-1)
    expect(normalizeTorrent({ ...base, state: 'stalledUP', eta: 8640000 }).eta).toBe(-1)
  })

  it('flags error states and empty swarm as -1', () => {
    const t = normalizeTorrent({ hash: 'h', state: 'error' })
    expect(t.error).toBe(1)
    expect(t.maxSeeders).toBe(-1)
    expect(t.trackers).toEqual([])
    expect(t.labels).toEqual([])
  })
})
