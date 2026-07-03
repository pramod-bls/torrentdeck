import { useState } from 'react'
import { Columns3 } from 'lucide-react'
import type { ColumnKey, TorrentsPanelConfig } from '@shared/types'
import type { Torrent } from '@shared/transmission'
import {
  ALL_COLUMNS,
  DEFAULT_VISIBLE_COLUMNS,
  gridTemplateFor,
  MIN_COLUMN_WIDTH,
  visibleColumnDefs
} from '@/features/torrents/columns'
import { TorrentRowShell, type RowReorder } from './TorrentRow'
import { statusColor } from '@/features/torrents/derive'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger
} from '@/components/ui/dropdown'
import { cn } from '@/lib/cn'

/**
 * Table view pieces. The header strip lives once per PANEL (rendered by
 * TorrentsPanel so grouped sections share one set of columns); rows are
 * rendered inside each ServerGroup with the same grid template.
 */

export function TableHeader({
  config,
  patch
}: {
  config: TorrentsPanelConfig
  patch: (p: Partial<TorrentsPanelConfig>) => void
}): React.JSX.Element {
  const defs = visibleColumnDefs(config.visibleColumns)
  const [dragKey, setDragKey] = useState<ColumnKey | null>(null)
  const [dropKey, setDropKey] = useState<ColumnKey | null>(null)

  const currentKeys = (): ColumnKey[] =>
    config.visibleColumns?.length ? config.visibleColumns : DEFAULT_VISIBLE_COLUMNS

  const toggleColumn = (key: ColumnKey): void => {
    const current = currentKeys()
    const next = current.includes(key) ? current.filter((k) => k !== key) : [...current, key]
    if (next.length === 0) return
    patch({ visibleColumns: next })
  }

  const reorderColumn = (from: ColumnKey, before: ColumnKey): void => {
    if (from === before) return
    const keys = currentKeys().filter((k) => k !== from)
    const idx = keys.indexOf(before)
    keys.splice(idx < 0 ? keys.length : idx, 0, from)
    patch({ visibleColumns: keys })
  }

  const cycleSort = (key: ColumnKey): void => {
    const sortKey = defs.find((d) => d.key === key)?.sortKey
    if (!sortKey) return
    patch({
      sort:
        config.sort.key === sortKey
          ? { key: sortKey, desc: !config.sort.desc }
          : { key: sortKey, desc: false }
    })
  }

  // Live width overrides while dragging a column border; committed on release.
  const [liveWidths, setLiveWidths] = useState<Record<string, number> | null>(null)

  const startResize = (key: ColumnKey, e: React.MouseEvent): void => {
    e.preventDefault()
    e.stopPropagation()
    const cell = (e.currentTarget as HTMLElement).parentElement
    if (!cell) return
    const startX = e.clientX
    const startWidth = cell.getBoundingClientRect().width
    const compute = (ev: MouseEvent): number =>
      Math.max(MIN_COLUMN_WIDTH, Math.round(startWidth + (ev.clientX - startX)))
    const onMove = (ev: MouseEvent): void => setLiveWidths({ [key]: compute(ev) })
    const onUp = (ev: MouseEvent): void => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      patch({ columnWidths: { ...config.columnWidths, [key]: compute(ev) } })
      setLiveWidths(null)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  const template = gridTemplateFor(defs, { ...config.columnWidths, ...liveWidths })

  return (
    <div className="flex items-center border-b border-surface-200 bg-surface-50 dark:border-surface-700 dark:bg-surface-800/60">
      <div className="grid min-w-0 flex-1 gap-2 px-3" style={{ gridTemplateColumns: template }}>
        {defs.map((d, i) => {
          const isSorted = d.sortKey === config.sort.key
          const isLast = i === defs.length - 1
          return (
            <div key={d.key} className="relative flex min-w-0 items-center">
              <button
                type="button"
                draggable
                onClick={() => d.sortKey && cycleSort(d.key)}
                onDragStart={() => setDragKey(d.key)}
                onDragOver={(e) => {
                  e.preventDefault()
                  if (dropKey !== d.key) setDropKey(d.key)
                }}
                onDrop={(e) => {
                  e.preventDefault()
                  if (dragKey) reorderColumn(dragKey, d.key)
                  setDragKey(null)
                  setDropKey(null)
                }}
                onDragEnd={() => {
                  setDragKey(null)
                  setDropKey(null)
                }}
                title="Click to sort · drag to reorder"
                className={cn(
                  'w-full cursor-grab truncate py-1 text-[11px] font-semibold text-surface-500 uppercase active:cursor-grabbing dark:text-surface-400',
                  d.align === 'right' ? 'text-right' : 'text-left',
                  'hover:text-surface-800 dark:hover:text-surface-200',
                  isSorted && 'text-accent-600 dark:text-accent-400',
                  dropKey === d.key && 'border-l-2 border-l-accent-500'
                )}
              >
                {d.label}
                {isSorted ? (config.sort.desc ? ' ↓' : ' ↑') : ''}
              </button>
              {!isLast && (
                <span
                  onMouseDown={(e) => startResize(d.key, e)}
                  onClick={(e) => e.stopPropagation()}
                  title="Drag to resize column"
                  className="absolute top-0 -right-1.5 z-10 h-full w-3 cursor-col-resize"
                />
              )}
            </div>
          )
        })}
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Choose columns"
            className="shrink-0 rounded p-1 text-surface-400 hover:bg-surface-200 hover:text-surface-700 dark:hover:bg-surface-700 dark:hover:text-surface-200"
          >
            <Columns3 size={13} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Columns</DropdownMenuLabel>
          {ALL_COLUMNS.map((c) => {
            const visible = (config.visibleColumns?.length ? config.visibleColumns : DEFAULT_VISIBLE_COLUMNS).includes(c.key)
            return (
              <DropdownMenuItem key={c.key} onSelect={() => toggleColumn(c.key)}>
                <span className="w-3 text-xs">{visible ? '✓' : ''}</span>
                {c.label}
              </DropdownMenuItem>
            )
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

export function TorrentTableRow({
  torrent,
  profileId,
  visibleColumns,
  columnWidths,
  reorder
}: {
  torrent: Torrent
  profileId: string
  visibleColumns: ColumnKey[] | undefined
  columnWidths?: Record<string, number>
  reorder?: RowReorder
}): React.JSX.Element {
  const defs = visibleColumnDefs(visibleColumns)
  return (
    <TorrentRowShell
      torrent={torrent}
      profileId={profileId}
      reorder={reorder}
      className={cn('block border-l-2 px-3', statusColor(torrent).stripe)}
    >
      <div
        className="grid h-7 items-center gap-2 text-xs"
        style={{ gridTemplateColumns: gridTemplateFor(defs, columnWidths) }}
      >
        {defs.map((d) => (
          <span
            key={d.key}
            className={cn('flex min-w-0 items-center', d.align === 'right' && 'justify-end text-right')}
          >
            {d.cell(torrent)}
          </span>
        ))}
      </div>
    </TorrentRowShell>
  )
}
