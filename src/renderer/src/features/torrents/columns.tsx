/**
 * Column registry for the table view. One entry per ColumnKey drives the
 * header strip, the visibility menu, cell rendering, and (via sortKey) which
 * SortPref a header click applies — same single-source-of-truth style as the
 * panel registry.
 */
import type { ColumnKey, SortKey } from '@shared/types'
import type { Torrent } from '@shared/transmission'
import { statusColor, statusText } from './derive'
import { formatBytes, formatDate, formatEta, formatPercent, formatRatio, formatSpeed } from '@/lib/format'

export interface ColumnDef {
  key: ColumnKey
  label: string
  /** CSS grid track for this column */
  track: string
  align: 'left' | 'right'
  sortKey?: SortKey
  cell: (t: Torrent) => React.ReactNode
}

export const COLUMNS: Record<ColumnKey, ColumnDef> = {
  name: {
    key: 'name',
    label: 'Name',
    track: 'minmax(160px, 2fr)',
    align: 'left',
    sortKey: 'name',
    cell: (t) => (
      <span className="truncate" title={t.name}>
        {t.name}
      </span>
    )
  },
  size: {
    key: 'size',
    label: 'Size',
    track: '72px',
    align: 'right',
    sortKey: 'totalSize',
    cell: (t) => formatBytes(t.totalSize)
  },
  progress: {
    key: 'progress',
    label: 'Progress',
    track: '110px',
    align: 'left',
    sortKey: 'percentDone',
    cell: (t) => (
      <span className="flex w-full items-center gap-1.5">
        <span className="h-1 min-w-0 flex-1 overflow-hidden rounded-full bg-surface-200 dark:bg-surface-700">
          <span
            className={`block h-full rounded-full ${t.error !== 0 ? 'bg-danger-500' : t.percentDone >= 1 ? 'bg-success-500' : 'bg-accent-500'}`}
            style={{ width: `${t.percentDone * 100}%` }}
          />
        </span>
        <span className="w-10 shrink-0 text-right text-[11px] text-surface-500">
          {formatPercent(t.percentDone)}
        </span>
      </span>
    )
  },
  status: {
    key: 'status',
    label: 'Status',
    track: '96px',
    align: 'left',
    sortKey: 'status',
    cell: (t) => <span className={`truncate ${statusColor(t).text}`}>{statusText(t)}</span>
  },
  downSpeed: {
    key: 'downSpeed',
    label: '↓ Speed',
    track: '78px',
    align: 'right',
    sortKey: 'rateDownload',
    cell: (t) =>
      t.rateDownload > 0 ? (
        <span className="text-accent-600 dark:text-accent-400">{formatSpeed(t.rateDownload)}</span>
      ) : (
        '—'
      )
  },
  upSpeed: {
    key: 'upSpeed',
    label: '↑ Speed',
    track: '78px',
    align: 'right',
    sortKey: 'rateUpload',
    cell: (t) =>
      t.rateUpload > 0 ? (
        <span className="text-success-600 dark:text-success-400">{formatSpeed(t.rateUpload)}</span>
      ) : (
        '—'
      )
  },
  ratio: {
    key: 'ratio',
    label: 'Ratio',
    track: '56px',
    align: 'right',
    sortKey: 'uploadRatio',
    cell: (t) => formatRatio(t.uploadRatio)
  },
  eta: {
    key: 'eta',
    label: 'ETA',
    track: '64px',
    align: 'right',
    sortKey: 'eta',
    cell: (t) => formatEta(t.eta)
  },
  added: {
    key: 'added',
    label: 'Added',
    track: '132px',
    align: 'right',
    sortKey: 'addedDate',
    cell: (t) => formatDate(t.addedDate)
  },
  labels: {
    key: 'labels',
    label: 'Labels',
    track: 'minmax(70px, 1fr)',
    align: 'left',
    cell: (t) => (
      <span className="truncate text-[11px] text-accent-700 dark:text-accent-300">
        {t.labels.join(', ')}
      </span>
    )
  }
}

export const ALL_COLUMNS = Object.values(COLUMNS)

export const DEFAULT_VISIBLE_COLUMNS: ColumnKey[] = [
  'name',
  'size',
  'progress',
  'status',
  'downSpeed',
  'upSpeed',
  'ratio',
  'eta'
]

export function visibleColumnDefs(visible: ColumnKey[] | undefined): ColumnDef[] {
  const keys = visible?.length ? visible : DEFAULT_VISIBLE_COLUMNS
  // preserve registry order regardless of stored order
  return ALL_COLUMNS.filter((c) => keys.includes(c.key))
}

export function gridTemplateFor(defs: ColumnDef[]): string {
  return defs.map((d) => d.track).join(' ')
}
