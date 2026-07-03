import { describe, expect, it } from 'vitest'
import { serverColor } from './serverColor'

describe('serverColor', () => {
  it('is deterministic for a given id', () => {
    expect(serverColor('abc')).toBe(serverColor('abc'))
  })
  it('returns a pastel hsl in range', () => {
    const m = serverColor('some-profile-id').match(/^hsl\((\d+) 62% 72%\)$/)
    expect(m).not.toBeNull()
    expect(Number(m![1])).toBeGreaterThanOrEqual(0)
    expect(Number(m![1])).toBeLessThan(360)
  })
  it('separates different ids (no trivial collisions across a small set)', () => {
    const hues = ['p1', 'p2', 'p3', 'p4', 'p5'].map((id) => serverColor(id))
    expect(new Set(hues).size).toBe(5)
  })
})
