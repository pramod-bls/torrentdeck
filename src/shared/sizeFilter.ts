/**
 * Size Filter core (see CONTEXT.md "Size Filter" / "Size Threshold" and
 * docs/adr/0005-size-filter.md). A pure function shared by every Electron world
 * — the renderer's Add dialog (`.torrent` path) and the main-process magnet
 * watcher both derive the not-wanted set the same way, so the rule lives here,
 * free of Node/Electron/React.
 */

/** Minimal shape needed to filter by size: anything carrying a byte length. */
export interface SizedFile {
  length: number
}

export const MB = 1024 * 1024

/**
 * Given a torrent's files (in their canonical index order) and a minimum size
 * threshold in bytes, return the indices to mark NOT-wanted — i.e. the files
 * strictly below the threshold that should be skipped.
 *
 * Guards, in order:
 *  - threshold <= 0 → filter is Off → nothing skipped.
 *  - a single-file torrent is never filtered (you can't skip the only file).
 *  - if the threshold would skip *every* file, nothing is skipped — a torrent
 *    is never left with nothing to download (glossary invariant).
 */
export function unwantedBySizeThreshold(files: readonly SizedFile[], thresholdBytes: number): number[] {
  if (!(thresholdBytes > 0)) return []
  if (files.length <= 1) return []

  const unwanted: number[] = []
  for (let i = 0; i < files.length; i++) {
    if (files[i].length < thresholdBytes) unwanted.push(i)
  }

  // Never leave the torrent with nothing wanted.
  if (unwanted.length === files.length) return []
  return unwanted
}

/**
 * Summary of applying a threshold, for the Add dialog's live readout.
 * `selected` = files that WILL download; `skipped` = files below threshold.
 */
export interface SizeFilterSummary {
  selectedCount: number
  selectedBytes: number
  skippedCount: number
  skippedBytes: number
}

export function sizeFilterSummary(
  files: readonly SizedFile[],
  thresholdBytes: number
): SizeFilterSummary {
  const skip = new Set(unwantedBySizeThreshold(files, thresholdBytes))
  const s: SizeFilterSummary = { selectedCount: 0, selectedBytes: 0, skippedCount: 0, skippedBytes: 0 }
  for (let i = 0; i < files.length; i++) {
    if (skip.has(i)) {
      s.skippedCount++
      s.skippedBytes += files[i].length
    } else {
      s.selectedCount++
      s.selectedBytes += files[i].length
    }
  }
  return s
}
