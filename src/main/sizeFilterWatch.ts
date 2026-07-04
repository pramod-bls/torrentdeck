/**
 * Best-effort Size Filter for magnet adds (see docs/adr/0005-size-filter.md).
 *
 * A magnet has no file list until the daemon fetches metadata from peers, and
 * Transmission/qBittorrent expose no before-add preview. So after adding such a
 * magnet we poll the torrent's files and, the instant they appear, mark the
 * sub-threshold ones not-wanted via the neutral `setTorrent` op. Deluge filters
 * before adding (prefetch) and is normally already done by the time this runs;
 * the pass is idempotent, so it harmlessly re-applies the same set.
 */
import type { TorrentClient } from './rpc/adapters'
import { unwantedBySizeThreshold } from '@shared/sizeFilter'
import { log } from './logger'

const POLL_MS = 2000
const MAX_TRIES = 90 // ~3 min: metadata can be slow on a thin swarm

/**
 * Fire-and-forget. Polls until the file list is known, applies the threshold,
 * then stops. Gives up quietly if the torrent is removed or metadata never
 * arrives. `thresholdBytes` must be > 0 (caller checks).
 */
export function scheduleMagnetSizeFilter(
  client: TorrentClient,
  id: string,
  thresholdBytes: number
): void {
  let tries = 0
  const tick = async (): Promise<void> => {
    tries += 1
    let files: readonly { length: number }[] | undefined
    try {
      const res = await client.getTorrentDetail(id)
      if (!res.ok || !res.data) return // gone, or a hard error → stop
      files = res.data.files
    } catch {
      return
    }
    if (!files || files.length === 0) {
      if (tries < MAX_TRIES) setTimeout(() => void tick(), POLL_MS)
      else log.info(`size-filter: gave up waiting for metadata on ${id}`)
      return
    }
    const unwanted = unwantedBySizeThreshold(files, thresholdBytes)
    if (unwanted.length > 0) {
      const r = await client.setTorrent([id], { 'files-unwanted': unwanted })
      log.info(
        `size-filter: ${id} — skipped ${unwanted.length}/${files.length} files under ${Math.round(thresholdBytes / (1024 * 1024))} MB${r.ok ? '' : ' (setTorrent failed)'}`
      )
    }
  }
  setTimeout(() => void tick(), 1500)
}
