import { useMemo } from 'react'
import { useAppDispatch, useAppSelector, useActiveProfileId, usePollingInterval } from '@/app/hooks'
import { useGetTorrentsQuery } from '@/services/rpcApi'
import { deriveSidebar } from '@/features/torrents/derive'
import { setLabelFilter, setStatusFilter, setTrackerFilter, type StatusFilter } from '@/features/ui/uiSlice'
import { cn } from '@/lib/cn'

const STATUS_ITEMS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'downloading', label: 'Downloading' },
  { key: 'seeding', label: 'Seeding' },
  { key: 'paused', label: 'Paused' },
  { key: 'checking', label: 'Verifying' },
  { key: 'error', label: 'Error' }
]

function Row({
  label,
  count,
  active,
  onClick
}: {
  label: string
  count: number
  active: boolean
  onClick: () => void
}): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center justify-between rounded px-2 py-1 text-left text-sm',
        active
          ? 'bg-blue-100 font-medium text-blue-800 dark:bg-blue-900/50 dark:text-blue-200'
          : 'text-neutral-700 hover:bg-neutral-200/60 dark:text-neutral-300 dark:hover:bg-neutral-700/60'
      )}
    >
      <span className="truncate">{label}</span>
      <span className="ml-2 text-xs text-neutral-500 dark:text-neutral-400">{count}</span>
    </button>
  )
}

function Heading({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <p className="px-2 pt-3 pb-1 text-[11px] font-semibold tracking-wide text-neutral-500 uppercase dark:text-neutral-400">
      {children}
    </p>
  )
}

export function Sidebar(): React.JSX.Element {
  const dispatch = useAppDispatch()
  const profileId = useActiveProfileId()!
  const pollingInterval = usePollingInterval()
  const { data: torrents = [] } = useGetTorrentsQuery({ profileId }, { pollingInterval })
  const { statusFilter, trackerFilter, labelFilter } = useAppSelector((s) => s.ui)

  const sidebar = useMemo(() => deriveSidebar(torrents), [torrents])
  const statusCounts: Record<StatusFilter, number> = {
    all: sidebar.all,
    downloading: sidebar.downloading,
    seeding: sidebar.seeding,
    paused: sidebar.paused,
    checking: sidebar.checking,
    error: sidebar.error
  }

  return (
    <div className="h-full w-full overflow-y-auto p-2">
      <Heading>Status</Heading>
      {STATUS_ITEMS.map(({ key, label }) => (
        <Row
          key={key}
          label={label}
          count={statusCounts[key]}
          active={statusFilter === key}
          onClick={() => dispatch(setStatusFilter(statusFilter === key && key !== 'all' ? 'all' : key))}
        />
      ))}

      {sidebar.trackers.length > 0 && (
        <>
          <Heading>Trackers</Heading>
          {sidebar.trackers.map(({ host, count }) => (
            <Row
              key={host}
              label={host}
              count={count}
              active={trackerFilter === host}
              onClick={() => dispatch(setTrackerFilter(trackerFilter === host ? null : host))}
            />
          ))}
        </>
      )}

      {sidebar.labels.length > 0 && (
        <>
          <Heading>Labels</Heading>
          {sidebar.labels.map(({ label, count }) => (
            <Row
              key={label}
              label={label}
              count={count}
              active={labelFilter === label}
              onClick={() => dispatch(setLabelFilter(labelFilter === label ? null : label))}
            />
          ))}
        </>
      )}
    </div>
  )
}
