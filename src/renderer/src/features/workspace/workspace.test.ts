import { describe, expect, it } from 'vitest'
import type { WorkspaceLayout } from '@shared/types'
import {
  CURRENT_LAYOUT_VERSION,
  defaultLayout,
  normalizeLayout,
  placeNewItem,
  PANELS
} from './panels'
import reducer, {
  gridChanged,
  panelAdded,
  panelRemoved,
  layoutReset,
  type WorkspaceState
} from './workspaceSlice'

describe('defaultLayout', () => {
  it('is valid under its own normalizer and mirrors the three-zone UX', () => {
    const layout = defaultLayout()
    expect(normalizeLayout(layout)).toEqual(layout)
    expect(layout.items.map((i) => i.type)).toEqual(['filters', 'torrent-list', 'detail'])
    const ids = new Set(layout.items.map((i) => i.i))
    expect(ids.size).toBe(3)
  })
})

describe('normalizeLayout', () => {
  it('rejects unknown versions outright', () => {
    const layout = { ...defaultLayout(), version: CURRENT_LAYOUT_VERSION + 1 }
    expect(normalizeLayout(layout)).toBeNull()
  })

  it('rejects null, garbage, and empty layouts', () => {
    expect(normalizeLayout(null)).toBeNull()
    expect(normalizeLayout('nonsense')).toBeNull()
    expect(normalizeLayout({ version: CURRENT_LAYOUT_VERSION, items: [] })).toBeNull()
  })

  it('drops unknown panel types item-by-item, keeping the rest', () => {
    const good = defaultLayout()
    const layout = {
      version: CURRENT_LAYOUT_VERSION,
      items: [...good.items, { i: 'x', type: 'geo-map', x: 0, y: 0, w: 2, h: 2 }]
    }
    const result = normalizeLayout(layout)
    expect(result?.items).toHaveLength(3)
  })
})

describe('placeNewItem', () => {
  it('places below the lowest existing item with registry default size', () => {
    const items = defaultLayout().items
    const it = placeNewItem('stats', items)
    expect(it.y).toBe(14)
    expect(it.x).toBe(0)
    expect(it.w).toBe(PANELS.stats.w)
    expect(it.h).toBe(PANELS.stats.h)
  })
})

describe('workspaceSlice', () => {
  const state = (): WorkspaceState => ({ layout: defaultLayout(), profileId: 'p1' })

  it('adds and removes panels', () => {
    let s = reducer(state(), panelAdded('stats'))
    expect(s.layout?.items).toHaveLength(4)
    const statsId = s.layout!.items.find((i) => i.type === 'stats')!.i
    s = reducer(s, panelRemoved(statsId))
    expect(s.layout?.items.map((i) => i.type)).not.toContain('stats')
  })

  it('merges grid positions by id without touching panel types', () => {
    const s0 = state()
    const target = s0.layout!.items[0]
    const s = reducer(s0, gridChanged({ [target.i]: { x: 5, y: 2, w: 4, h: 8 } }))
    const moved = s.layout!.items.find((i) => i.i === target.i)!
    expect(moved).toMatchObject({ x: 5, y: 2, w: 4, h: 8, type: target.type })
    expect(s.layout!.items[1]).toEqual(s0.layout!.items[1])
  })

  it('reset restores the default arrangement', () => {
    let s = reducer(state(), panelRemoved(state().layout!.items[0].i))
    s = reducer(s, layoutReset())
    expect(s.layout?.items).toHaveLength(3)
  })
})

describe('layout persistence shape', () => {
  it('round-trips through JSON (structured-clone-safe for IPC)', () => {
    const layout: WorkspaceLayout = defaultLayout()
    expect(JSON.parse(JSON.stringify(layout))).toEqual(layout)
  })
})
