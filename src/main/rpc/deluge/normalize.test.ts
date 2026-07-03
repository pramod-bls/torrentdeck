import { describe, expect, it } from 'vitest'
import { TorrentStatus } from '@shared/transmission'
import { availabilityFromCopies, mapState, mapTrackers, normalizeTorrent } from './normalize'

describe('mapState', () => {
  it('maps direct Deluge states', () => {
    expect(mapState('Downloading', 0.5)).toBe(TorrentStatus.Downloading)
    expect(mapState('Seeding', 1)).toBe(TorrentStatus.Seeding)
    expect(mapState('Paused', 0.5)).toBe(TorrentStatus.Stopped)
    expect(mapState('Checking', 0.2)).toBe(TorrentStatus.Checking)
    expect(mapState('Allocating', 0)).toBe(TorrentStatus.Checking)
    expect(mapState('Error', 0.5)).toBe(TorrentStatus.Stopped)
  })
  it('splits Queued by progress into download- vs seed-wait', () => {
    expect(mapState('Queued', 0.4)).toBe(TorrentStatus.DownloadWait)
    expect(mapState('Queued', 1)).toBe(TorrentStatus.SeedWait)
  })
})

describe('availabilityFromCopies', () => {
  it('is 1 when complete and clamps otherwise', () => {
    expect(availabilityFromCopies(0, 0)).toBe(1)
    expect(availabilityFromCopies(500, 2.5)).toBe(1)
    expect(availabilityFromCopies(500, 0.4)).toBeCloseTo(0.4)
    expect(availabilityFromCopies(500, -1)).toBe(0)
  })
})

describe('mapTrackers', () => {
  it('maps Deluge tracker url→announce and tolerates junk', () => {
    expect(mapTrackers([{ url: 'http://t/announce', tier: 1 }])).toEqual([
      { announce: 'http://t/announce', id: 0, scrape: '', sitename: '', tier: 1 }
    ])
    expect(mapTrackers(undefined)).toEqual([])
  })
})

describe('normalizeTorrent', () => {
  const hash = 'abc123def456'
  const base = {
    name: 'Ubuntu ISO',
    state: 'Downloading',
    progress: 42.5,
    total_size: 1000,
    total_wanted: 900,
    total_remaining: 500,
    download_payload_rate: 2048,
    upload_payload_rate: 128,
    ratio: 0.8,
    eta: 300,
    time_added: 1_700_000_000.7,
    queue: 3,
    num_peers: 10,
    num_seeds: 4,
    total_seeds: 20,
    total_peers: 55,
    is_finished: false,
    save_path: '/downloads',
    distributed_copies: 1.3,
    label: 'isos'
  }

  it('uses the infohash as id and scales progress 0-100 → 0-1', () => {
    const t = normalizeTorrent(hash, base)
    expect(t.id).toBe(hash)
    expect(t.hashString).toBe(hash)
    expect(t.percentDone).toBeCloseTo(0.425)
    expect(t.status).toBe(TorrentStatus.Downloading)
  })

  it('derives swarm and availability, and single-label array', () => {
    const t = normalizeTorrent(hash, base)
    expect(t.maxSeeders).toBe(20)
    expect(t.maxLeechers).toBe(35) // total_peers - total_seeds
    expect(t.availRatio).toBe(1) // distributed_copies >= 1
    expect(t.labels).toEqual(['isos'])
    expect(t.addedDate).toBe(1_700_000_000)
  })

  it('reports unknown eta as -1 unless actively downloading', () => {
    expect(normalizeTorrent(hash, { ...base, state: 'Seeding', eta: 0 }).eta).toBe(-1)
    expect(normalizeTorrent(hash, base).eta).toBe(300)
  })

  it('flags errors and stubs swarm as -1 when the daemon omits scrape counts', () => {
    const err = normalizeTorrent(hash, { state: 'Error', tracker_status: 'boom' })
    expect(err.error).toBe(1)
    expect(err.errorString).toBe('boom')
    expect(err.maxSeeders).toBe(-1)
    expect(err.labels).toEqual([])
  })
})
