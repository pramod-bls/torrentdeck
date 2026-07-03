import { Columns3 } from 'lucide-react'
import type { ColumnKey, TorrentsPanelConfig } from '@shared/types'
import type { Torrent } from '@shared/transmission'
import {
  ALL_COLUMNS,
  DEFAULT_VISIBLE_COLUMNS,
  gridTemplateFor,
  visibleColumnDefs
} from '@/features/torrents/columns'
import { TorrentRowShell } from './TorrentRow'
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

  const toggleColumn = (key: ColumnKey): void => {
    const current = config.visibleColumns?.length ? config.visibleColumns : DEFAULT_VISIBLE_COLUMNS
    const next = current.includes(key)
      ? current.filter((k) => k !== key)
      : [...current, key]
    if (next.length === 0) return
    patch({ visibleColumns: next })
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

  return (
    <div className="flex items-center border-b border-surface-200 bg-surface-50 dark:border-surface-700 dark:bg-surface-800/60">
      <div
        className="grid min-w-0 flex-1 gap-2 px-3"
        style={{ gridTemplateColumns: gridTemplateFor(defs) }}
      >
        {defs.map((d) => {
          const isSorted = d.sortKey === config.sort.key
          return (
            <button
              key={d.key}
              type="button"
              disabled={!d.sortKey}
              onClick={() => cycleSort(d.key)}
              className={cn(
                'truncate py-1 text-[11px] font-semibold text-surface-500 uppercase dark:text-surface-400',
                d.align === 'right' ? 'text-right' : 'text-left',
                d.sortKey && 'hover:text-surface-800 dark:hover:text-surface-200',
                isSorted && 'text-accent-600 dark:text-accent-400'
              )}
            >
              {d.label}
              {isSorted ? (config.sort.desc ? ' ↓' : ' ↑') : ''}
            </button>
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
  visibleColumns
}: {
  torrent: Torrent
  profileId: string
  visibleColumns: ColumnKey[] | undefined
}): React.JSX.Element {
  const defs = visibleColumnDefs(visibleColumns)
  return (
    <TorrentRowShell
      torrent={torrent}
      profileId={profileId}
      className={cn('block border-l-2 px-3', statusColor(torrent).stripe)}
    >
      <div
        className="grid h-7 items-center gap-2 text-xs"
        style={{ gridTemplateColumns: gridTemplateFor(defs) }}
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
