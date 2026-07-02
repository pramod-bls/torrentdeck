/**
 * The panel registry's metadata half: everything about panel types EXCEPT
 * their React components (those live in registry.tsx, keeping this module
 * import-cycle-free and unit-testable). This single table drives the "Add
 * panel" picker, layout validation, and default sizing — one source of truth,
 * per ADR-0002.
 */
import type { PanelTypeId, WorkspaceItem, WorkspaceLayout } from '@shared/types'

export type PanelCategory = 'Torrents' | 'Torrent detail' | 'Server'

export interface PanelMeta {
  type: PanelTypeId
  title: string
  category: PanelCategory
  /** Default size in grid units when added */
  w: number
  h: number
  minW: number
  minH: number
  /** May the user place more than one instance? */
  multiInstance: boolean
}

export const GRID_COLS = 12
export const GRID_ROW_HEIGHT = 40

export const PANELS: Record<PanelTypeId, PanelMeta> = {
  'torrent-list': {
    type: 'torrent-list',
    title: 'Torrents',
    category: 'Torrents',
    w: 7,
    h: 14,
    minW: 3,
    minH: 4,
    multiInstance: true
  },
  filters: {
    type: 'filters',
    title: 'Filters',
    category: 'Torrents',
    w: 2,
    h: 14,
    minW: 2,
    minH: 4,
    multiInstance: false
  },
  detail: {
    type: 'detail',
    title: 'Torrent detail',
    category: 'Torrent detail',
    w: 3,
    h: 14,
    minW: 3,
    minH: 6,
    multiInstance: false
  },
  'detail-general': {
    type: 'detail-general',
    title: 'General',
    category: 'Torrent detail',
    w: 3,
    h: 10,
    minW: 2,
    minH: 4,
    multiInstance: false
  },
  'detail-files': {
    type: 'detail-files',
    title: 'Files',
    category: 'Torrent detail',
    w: 3,
    h: 10,
    minW: 2,
    minH: 4,
    multiInstance: false
  },
  'detail-peers': {
    type: 'detail-peers',
    title: 'Peers',
    category: 'Torrent detail',
    w: 3,
    h: 10,
    minW: 2,
    minH: 4,
    multiInstance: false
  },
  'detail-trackers': {
    type: 'detail-trackers',
    title: 'Trackers',
    category: 'Torrent detail',
    w: 3,
    h: 10,
    minW: 2,
    minH: 4,
    multiInstance: false
  },
  stats: {
    type: 'stats',
    title: 'Session stats',
    category: 'Server',
    w: 3,
    h: 6,
    minW: 2,
    minH: 4,
    multiInstance: false
  }
}

export const PANEL_CATEGORIES: PanelCategory[] = ['Torrents', 'Torrent detail', 'Server']

export const CURRENT_LAYOUT_VERSION = 1

/** The out-of-the-box workspace, mirroring the classic v0.1 three-zone UX. */
export function defaultLayout(): WorkspaceLayout {
  return {
    version: CURRENT_LAYOUT_VERSION,
    items: [
      { i: crypto.randomUUID(), type: 'filters', x: 0, y: 0, w: 2, h: 14 },
      { i: crypto.randomUUID(), type: 'torrent-list', x: 2, y: 0, w: 7, h: 14 },
      { i: crypto.randomUUID(), type: 'detail', x: 9, y: 0, w: 3, h: 14 }
    ]
  }
}

function isValidItem(raw: unknown): raw is WorkspaceItem {
  if (typeof raw !== 'object' || raw === null) return false
  const it = raw as Record<string, unknown>
  return (
    typeof it.i === 'string' &&
    typeof it.type === 'string' &&
    it.type in PANELS &&
    [it.x, it.y, it.w, it.h].every((n) => typeof n === 'number' && Number.isFinite(n))
  )
}

/**
 * Validate (and later: migrate) a persisted layout. Returns null when the
 * layout is unusable — callers fall back to defaultLayout(). Unknown panel
 * types are dropped item-by-item so one bad entry doesn't nuke the workspace;
 * an unknown *version* rejects the whole layout (schema semantics unknown).
 */
export function normalizeLayout(raw: unknown): WorkspaceLayout | null {
  if (typeof raw !== 'object' || raw === null) return null
  const layout = raw as { version?: unknown; items?: unknown }
  if (layout.version !== CURRENT_LAYOUT_VERSION) return null
  if (!Array.isArray(layout.items)) return null
  const items = layout.items.filter(isValidItem)
  if (items.length === 0) return null
  return { version: CURRENT_LAYOUT_VERSION, items }
}

/** Grid position for a newly added panel: full-left, below everything else. */
export function placeNewItem(type: PanelTypeId, existing: WorkspaceItem[]): WorkspaceItem {
  const meta = PANELS[type]
  const bottom = existing.reduce((max, it) => Math.max(max, it.y + it.h), 0)
  return { i: crypto.randomUUID(), type, x: 0, y: bottom, w: meta.w, h: meta.h }
}
