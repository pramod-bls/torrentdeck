import { describe, expect, it } from 'vitest'
import type { Torrent } from '@shared/transmission'
import { findCompletions } from './completions'

const t = (id: number, leftUntilDone: number, percentDone: number): Torrent =>
  ({ id, name: `t${id}`, leftUntilDone, percentDone }) as Torrent

describe('findCompletions', () => {
  it('returns nothing on the first snapshot (no prev)', () => {
    expect(findCompletions(undefined, [t(1, 0, 1)])).toEqual([])
  })

  it('detects a leftUntilDone > 0 → 0 transition', () => {
    const prev = [t(1, 500, 0.9), t(2, 0, 1)]
    const next = [t(1, 0, 1), t(2, 0, 1)]
    expect(findCompletions(prev, next)).toEqual([{ id: 1, name: 't1' }])
  })

  it('ignores torrents that were already complete or are still downloading', () => {
    const prev = [t(1, 0, 1), t(2, 100, 0.5)]
    const next = [t(1, 0, 1), t(2, 50, 0.75)]
    expect(findCompletions(prev, next)).toEqual([])
  })

  it('ignores torrents that appeared new already complete (e.g. re-added seeds)', () => {
    expect(findCompletions([], [t(9, 0, 1)])).toEqual([])
  })
})
