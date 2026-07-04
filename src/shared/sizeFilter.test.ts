import { describe, expect, it } from 'vitest'
import { MB, sizeFilterSummary, unwantedBySizeThreshold, type SizedFile } from './sizeFilter'

const files = (...lengths: number[]): SizedFile[] => lengths.map((length) => ({ length }))

describe('unwantedBySizeThreshold', () => {
  it('returns nothing when the threshold is off (0 or negative)', () => {
    expect(unwantedBySizeThreshold(files(1, 2 * MB, 3), 0)).toEqual([])
    expect(unwantedBySizeThreshold(files(1, 2 * MB, 3), -5)).toEqual([])
  })

  it('marks files strictly below the threshold', () => {
    // 5 MB threshold over [500KB, 10MB, 2MB, 50MB] → indices 0 and 2
    const f = files(500 * 1024, 10 * MB, 2 * MB, 50 * MB)
    expect(unwantedBySizeThreshold(f, 5 * MB)).toEqual([0, 2])
  })

  it('treats the threshold as an inclusive floor (== is kept)', () => {
    const f = files(10 * MB, 5 * MB, 4 * MB)
    // exactly 5 MB is kept; only the 4 MB file is skipped
    expect(unwantedBySizeThreshold(f, 5 * MB)).toEqual([2])
  })

  it('never filters a single-file torrent', () => {
    expect(unwantedBySizeThreshold(files(1), 10 * MB)).toEqual([])
  })

  it('never leaves a torrent with nothing wanted (all below threshold)', () => {
    expect(unwantedBySizeThreshold(files(1 * MB, 2 * MB, 3 * MB), 10 * MB)).toEqual([])
  })

  it('handles an empty file list', () => {
    expect(unwantedBySizeThreshold([], 10 * MB)).toEqual([])
  })

  it('keeps at least one file when exactly one is above the threshold', () => {
    const f = files(1, 2, 100 * MB)
    expect(unwantedBySizeThreshold(f, 10 * MB)).toEqual([0, 1])
  })
})

describe('sizeFilterSummary', () => {
  it('splits selected vs skipped counts and bytes', () => {
    const f = files(500 * 1024, 10 * MB, 2 * MB, 50 * MB)
    const s = sizeFilterSummary(f, 5 * MB)
    expect(s.skippedCount).toBe(2)
    expect(s.skippedBytes).toBe(500 * 1024 + 2 * MB)
    expect(s.selectedCount).toBe(2)
    expect(s.selectedBytes).toBe(10 * MB + 50 * MB)
  })

  it('counts everything as selected when the filter is off', () => {
    const f = files(1, 2, 3)
    const s = sizeFilterSummary(f, 0)
    expect(s.selectedCount).toBe(3)
    expect(s.skippedCount).toBe(0)
    expect(s.selectedBytes).toBe(6)
  })

  it('counts everything as selected when all files fall below threshold (guard)', () => {
    const f = files(1 * MB, 2 * MB)
    const s = sizeFilterSummary(f, 10 * MB)
    expect(s.selectedCount).toBe(2)
    expect(s.skippedCount).toBe(0)
  })
})
