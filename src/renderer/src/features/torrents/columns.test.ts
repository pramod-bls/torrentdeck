import { describe, expect, it } from 'vitest'
import { visibleColumnDefs } from './columns'

describe('visibleColumnDefs', () => {
  it('honors the stored array order (for header drag-reorder)', () => {
    const defs = visibleColumnDefs(['status', 'name', 'queue'])
    expect(defs.map((d) => d.key)).toEqual(['status', 'name', 'queue'])
  })

  it('drops unknown/removed column keys from older layouts', () => {
    const defs = visibleColumnDefs(['name', 'geo' as never, 'size'])
    expect(defs.map((d) => d.key)).toEqual(['name', 'size'])
  })

  it('falls back to defaults (queue first) when unset', () => {
    expect(visibleColumnDefs(undefined)[0].key).toBe('queue')
  })
})
