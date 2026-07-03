import { ArrowDownUp, Check, ChevronDown, LayoutList, Server, Search, Table2 } from 'lucide-react'
import type { ServerProfile, SortKey, TorrentsPanelConfig } from '@shared/types'
import type { Torrent } from '@shared/transmission'
import type { StatusFilter } from '@shared/types'
import { deriveSidebar } from '@/features/torrents/derive'
import { useMemo } from 'react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/cn'

export const SORT_LABELS: Record<SortKey, string> = {
  name: 'Name',
  totalSize: 'Size',
  percentDone: 'Progress',
  status: 'Status',
  rateDownload: 'Download speed',
  rateUpload: 'Upload speed',
  uploadRatio: 'Ratio',
  eta: 'ETA',
  addedDate: 'Date added',
  queuePosition: 'Queue position'
}

const STATUS_LABELS: Record<StatusFilter, string> = {
  all: 'All',
  downloading: 'Downloading',
  seeding: 'Seeding',
  paused: 'Paused',
  checking: 'Verifying',
  error: 'Error'
}

const selectCls =
  'h-6 max-w-32 rounded border border-surface-300 bg-surface-50 px-1 text-xs text-surface-700 dark:border-surface-600 dark:bg-surface-800 dark:text-surface-300'

/**
 * The per-panel control strip: server scope, status/tracker/label filters,
 * sort, and search — all reading from and writing to this panel instance's
 * persisted TorrentsPanelConfig via the `patch` callback.
 */
export function FilterBar({
  config,
  patch,
  profiles,
  scopedIds,
  aggregated
}: {
  config: TorrentsPanelConfig
  patch: (p: Partial<TorrentsPanelConfig>) => void
  profiles: ServerProfile[]
  scopedIds: string[]
  /** union of cached torrents across the panel's servers, for filter options/counts */
  aggregated: Torrent[]
}): React.JSX.Element {
  const sidebar = useMemo(() => deriveSidebar(aggregated), [aggregated])
  const statusCounts: Record<StatusFilter, number> = {
    all: sidebar.all,
    downloading: sidebar.downloading,
    seeding: sidebar.seeding,
    paused: sidebar.paused,
    checking: sidebar.checking,
    error: sidebar.error
  }

  const toggleServer = (id: string): void => {
    const current = config.servers === 'default' ? scopedIds : config.servers
    const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id]
    if (next.length === 0) return
    patch({ servers: next })
  }

  const scopeLabel =
    config.servers === 'default'
      ? 'Default'
      : scopedIds.length === 1
        ? (profiles.find((p) => p.id === scopedIds[0])?.name ?? '1 server')
        : `${scopedIds.length} servers`

  return (
    <div className="flex flex-wrap items-center gap-1.5 border-b border-surface-200 px-2 py-1.5 dark:border-surface-700">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="secondary" size="sm" className="h-6 px-1.5 text-xs">
            <Server size={11} /> {scopeLabel} <ChevronDown size={10} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuLabel>Servers shown</DropdownMenuLabel>
          <DropdownMenuItem onSelect={() => patch({ servers: 'default' })}>
            <span className="w-3">{config.servers === 'default' ? <Check size={12} /> : null}</span>
            Follow default server
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {profiles.map((p) => (
            <DropdownMenuItem key={p.id} onSelect={() => toggleServer(p.id)}>
              <span className="w-3">
                {config.servers !== 'default' && scopedIds.includes(p.id) ? <Check size={12} /> : null}
              </span>
              {p.name}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <select
        value={config.filters.status}
        onChange={(e) =>
          patch({ filters: { ...config.filters, status: e.target.value as StatusFilter } })
        }
        aria-label="Status filter"
        className={cn(selectCls, config.filters.status !== 'all' && 'border-accent-400')}
      >
        {(Object.keys(STATUS_LABELS) as StatusFilter[]).map((k) => (
          <option key={k} value={k}>
            {STATUS_LABELS[k]} ({statusCounts[k]})
          </option>
        ))}
      </select>

      <select
        value={config.filters.tracker ?? ''}
        onChange={(e) => patch({ filters: { ...config.filters, tracker: e.target.value || null } })}
        aria-label="Tracker filter"
        className={cn(selectCls, config.filters.tracker && 'border-accent-400')}
      >
        <option value="">All trackers</option>
        {sidebar.trackers.map(({ host, count }) => (
          <option key={host} value={host}>
            {host} ({count})
          </option>
        ))}
      </select>

      <select
        value={config.filters.label ?? ''}
        onChange={(e) => patch({ filters: { ...config.filters, label: e.target.value || null } })}
        aria-label="Label filter"
        className={cn(selectCls, config.filters.label && 'border-accent-400')}
      >
        <option value="">All labels</option>
        {sidebar.labels.map(({ label, count }) => (
          <option key={label} value={label}>
            {label} ({count})
          </option>
        ))}
      </select>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-6 px-1.5 text-xs" aria-label="Sort">
            <ArrowDownUp size={11} />
            {SORT_LABELS[config.sort.key]} {config.sort.desc ? '↓' : '↑'}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Sort by</DropdownMenuLabel>
          {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
            <DropdownMenuItem
              key={key}
              onSelect={() =>
                patch({
                  sort:
                    config.sort.key === key
                      ? { key, desc: !config.sort.desc }
                      : { key, desc: false }
                })
              }
            >
              <span className="w-3 text-xs">
                {config.sort.key === key ? (config.sort.desc ? '↓' : '↑') : ''}
              </span>
              {SORT_LABELS[key]}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <button
        type="button"
        aria-label={config.view === 'cards' ? 'Switch to table view' : 'Switch to card view'}
        title={config.view === 'cards' ? 'Table view' : 'Card view'}
        onClick={() => patch({ view: config.view === 'cards' ? 'table' : 'cards' })}
        className="rounded p-1 text-surface-400 hover:bg-surface-200 hover:text-surface-700 dark:hover:bg-surface-700 dark:hover:text-surface-200"
      >
        {config.view === 'cards' ? <Table2 size={13} /> : <LayoutList size={13} />}
      </button>

      <span className="relative ml-auto">
        <Search
          size={11}
          className="pointer-events-none absolute top-1/2 left-1.5 -translate-y-1/2 text-surface-400"
        />
        <input
          value={config.filters.search}
          onChange={(e) => patch({ filters: { ...config.filters, search: e.target.value } })}
          placeholder="Search"
          data-panel-search
          className="h-6 w-36 rounded border border-surface-300 bg-surface-50 pl-5 text-xs placeholder:text-surface-400 focus-visible:outline-1 focus-visible:outline-accent-500 dark:border-surface-600 dark:bg-surface-800"
        />
      </span>
    </div>
  )
}
