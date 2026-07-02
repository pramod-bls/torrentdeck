/**
 * The panel registry's metadata half: everything about panel types EXCEPT
 * their React components (those live in registry.tsx, keeping this module
 * import-cycle-free and unit-testable). This single table drives the "Add
 * panel" picker, layout validation/migration, and default sizing — one source
 * of truth, per ADR-0002.
 */
import type {
  PanelTypeId,
  SortPref,
  TorrentsPanelConfig,
  WorkspaceItem,
  WorkspaceLayout
} from '@shared/types'

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
    w: 9,
    h: 14,
    minW: 4,
    minH: 5,
    multiInstance: true
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

export const CURRENT_LAYOUT_VERSION = 2

export function defaultPanelConfig(sort?: SortPref): TorrentsPanelConfig {
  return {
    servers: 'default',
    filters: { status: 'all', tracker: null, label: null, search: '' },
    sort: sort ?? { key: 'addedDate', desc: true },
    view: 'cards'
  }
}

/** The out-of-the-box workspace: one Torrents panel plus the tabbed detail. */
export function defaultLayout(): WorkspaceLayout {
  return {
    version: CURRENT_LAYOUT_VERSION,
    items: [
      {
        i: crypto.randomUUID(),
        type: 'torrent-list',
        x: 0,
        y: 0,
        w: 9,
        h: 14,
        config: defaultPanelConfig()
      },
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

/** Ensure a torrent-list item carries a complete config (fills gaps from defaults). */
function withConfig(item: WorkspaceItem, seedSort?: SortPref): WorkspaceItem {
  if (item.type !== 'torrent-list') return item
  const base = defaultPanelConfig(seedSort)
  const cfg = (item.config ?? {}) as Partial<TorrentsPanelConfig>
  return {
    ...item,
    config: {
      servers: Array.isArray(cfg.servers) || cfg.servers === 'default' ? cfg.servers : base.servers,
      filters: { ...base.filters, ...(cfg.filters ?? {}) },
      sort: cfg.sort ?? base.sort,
      view: cfg.view === 'table' ? 'table' : 'cards',
      visibleColumns: cfg.visibleColumns,
      collapsedServers: cfg.collapsedServers
    }
  }
}

/**
 * Validate and migrate a persisted layout. Returns null when unusable —
 * callers fall back to defaultLayout(). Unknown panel types are dropped
 * item-by-item (this is also how v1's retired 'filters' panel disappears);
 * an unknown *future* version rejects the whole layout.
 *
 * @param seedSort sort applied to migrated v1 list panels, so a user's old
 * global sort preference carries over into the per-panel world.
 */
export function normalizeLayout(raw: unknown, seedSort?: SortPref): WorkspaceLayout | null {
  if (typeof raw !== 'object' || raw === null) return null
  const layout = raw as { version?: unknown; items?: unknown }
  if (typeof layout.version !== 'number' || layout.version > CURRENT_LAYOUT_VERSION) return null
  if (!Array.isArray(layout.items)) return null
  const items = layout.items.filter(isValidItem).map((it) => withConfig(it, seedSort))
  if (items.length === 0) return null
  return { version: CURRENT_LAYOUT_VERSION, items }
}

/** Grid position for a newly added panel: full-left, below everything else. */
export function placeNewItem(type: PanelTypeId, existing: WorkspaceItem[]): WorkspaceItem {
  const meta = PANELS[type]
  const bottom = existing.reduce((max, it) => Math.max(max, it.y + it.h), 0)
  const item: WorkspaceItem = { i: crypto.randomUUID(), type, x: 0, y: bottom, w: meta.w, h: meta.h }
  return type === 'torrent-list' ? { ...item, config: defaultPanelConfig() } : item
}
