import { useMemo, useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import * as ContextMenu from '@radix-ui/react-context-menu'
import { ArrowDown, ArrowUp } from 'lucide-react'
import type { Torrent } from '@shared/transmission'
import { useAppDispatch, useAppSelector, useActiveProfileId, usePollingInterval } from '@/app/hooks'
import { useGetTorrentsQuery, useTorrentActionMutation } from '@/services/rpcApi'
import { filterTorrents, sortTorrents, statusText } from '@/features/torrents/derive'
import { clearSelection, openRemoveConfirm, selectTorrent } from '@/features/ui/uiSlice'
import { formatEta, formatPercent, formatRatio, formatSpeed, formatBytes } from '@/lib/format'
import { cn } from '@/lib/cn'
import { TorrentStatus } from '@shared/transmission'

function ProgressBar({ torrent }: { torrent: Torrent }): React.JSX.Element {
  const checking = torrent.status === TorrentStatus.Checking
  const fraction = checking ? torrent.recheckProgress : torrent.percentDone
  const color =
    torrent.error !== 0
      ? 'bg-red-500'
      : torrent.status === TorrentStatus.Stopped
        ? 'bg-neutral-400 dark:bg-neutral-500'
        : torrent.percentDone >= 1
          ? 'bg-green-500'
          : 'bg-blue-500'
  return (
    <div className="h-1 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700">
      <div className={cn('h-full rounded-full', color)} style={{ width: `${fraction * 100}%` }} />
    </div>
  )
}

function RowStats({ torrent }: { torrent: Torrent }): React.JSX.Element {
  const parts: string[] = []
  const isDone = torrent.percentDone >= 1
  parts.push(isDone ? formatBytes(torrent.totalSize) : `${formatPercent(torrent.percentDone)} of ${formatBytes(torrent.sizeWhenDone)}`)
  parts.push(statusText(torrent))
  if (torrent.status === TorrentStatus.Downloading) {
    if (torrent.eta >= 0) parts.push(formatEta(torrent.eta))
    parts.push(`${torrent.peersSendingToUs}/${torrent.peersConnected} peers`)
  }
  if (torrent.status === TorrentStatus.Seeding) parts.push(`ratio ${formatRatio(torrent.uploadRatio)}`)
  return (
    <span className="flex items-center gap-2 truncate text-xs text-neutral-500 dark:text-neutral-400">
      <span className="truncate">{parts.join(' · ')}</span>
      {torrent.rateDownload > 0 && (
        <span className="flex shrink-0 items-center gap-0.5 text-blue-600 dark:text-blue-400">
          <ArrowDown size={11} /> {formatSpeed(torrent.rateDownload)}
        </span>
      )}
      {torrent.rateUpload > 0 && (
        <span className="flex shrink-0 items-center gap-0.5 text-green-600 dark:text-green-400">
          <ArrowUp size={11} /> {formatSpeed(torrent.rateUpload)}
        </span>
      )}
    </span>
  )
}

export function TorrentList(): React.JSX.Element {
  const dispatch = useAppDispatch()
  const profileId = useActiveProfileId()!
  const pollingInterval = usePollingInterval()
  const { data: torrents = [], isLoading, error } = useGetTorrentsQuery({ profileId }, { pollingInterval })
  const { search, statusFilter, trackerFilter, labelFilter, sort, selectedIds } = useAppSelector((s) => s.ui)
  const [torrentAction] = useTorrentActionMutation()

  const visible = useMemo(
    () => sortTorrents(filterTorrents(torrents, { statusFilter, trackerFilter, labelFilter, search }), sort),
    [torrents, statusFilter, trackerFilter, labelFilter, search, sort]
  )

  const parentRef = useRef<HTMLDivElement>(null)
  const virtualizer = useVirtualizer({
    count: visible.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 56,
    overscan: 12
  })

  if (error) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-1 p-8 text-center">
        <p className="text-sm font-medium text-red-600 dark:text-red-400">Can't reach the server</p>
        <p className="max-w-sm text-xs text-neutral-500">
          {'message' in error ? error.message : 'Connection failed'}
        </p>
      </div>
    )
  }

  if (!isLoading && visible.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <p className="text-sm text-neutral-500">
          {torrents.length === 0 ? 'No torrents on this server' : 'No torrents match the current filters'}
        </p>
      </div>
    )
  }

  const actionFor = (ids: number[], action: 'torrent-start' | 'torrent-start-now' | 'torrent-stop' | 'torrent-verify' | 'torrent-reannounce') => () =>
    void torrentAction({ profileId, action, ids })

  return (
    <div ref={parentRef} className="min-w-0 flex-1 overflow-y-auto" onClick={() => dispatch(clearSelection())}>
      <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
        {virtualizer.getVirtualItems().map((row) => {
          const t = visible[row.index]
          const selected = selectedIds.includes(t.id)
          const ctxIds = selected ? selectedIds : [t.id]
          return (
            <ContextMenu.Root key={t.id}>
              <ContextMenu.Trigger asChild>
                <div
                  role="row"
                  aria-selected={selected}
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', transform: `translateY(${row.start}px)` }}
                  onClick={(e) => {
                    e.stopPropagation()
                    dispatch(selectTorrent({ id: t.id, additive: e.metaKey || e.ctrlKey }))
                  }}
                  onContextMenu={() => {
                    if (!selected) dispatch(selectTorrent({ id: t.id, additive: false }))
                  }}
                  className={cn(
                    'flex h-14 flex-col justify-center gap-1 border-b border-neutral-100 px-3 dark:border-neutral-800',
                    selected ? 'bg-blue-50 dark:bg-blue-950/40' : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/50'
                  )}
                >
                  <span className={cn('truncate text-sm', selected && 'font-medium')}>{t.name}</span>
                  <ProgressBar torrent={t} />
                  <RowStats torrent={t} />
                </div>
              </ContextMenu.Trigger>
              <ContextMenu.Portal>
                <ContextMenu.Content className="z-50 min-w-44 rounded-md border border-neutral-200 bg-white p-1 text-sm shadow-lg dark:border-neutral-700 dark:bg-neutral-800">
                  {(
                    [
                      ['Start', actionFor(ctxIds, 'torrent-start')],
                      ['Start now', actionFor(ctxIds, 'torrent-start-now')],
                      ['Pause', actionFor(ctxIds, 'torrent-stop')],
                      ['Verify local data', actionFor(ctxIds, 'torrent-verify')],
                      ['Ask tracker for more peers', actionFor(ctxIds, 'torrent-reannounce')]
                    ] as [string, () => void][]
                  ).map(([label, fn]) => (
                    <ContextMenu.Item
                      key={label}
                      onSelect={fn}
                      className="rounded px-2 py-1.5 outline-none select-none data-highlighted:bg-neutral-100 dark:data-highlighted:bg-neutral-700"
                    >
                      {label}
                    </ContextMenu.Item>
                  ))}
                  <ContextMenu.Separator className="my-1 h-px bg-neutral-200 dark:bg-neutral-700" />
                  <ContextMenu.Item
                    onSelect={() => dispatch(openRemoveConfirm(ctxIds))}
                    className="rounded px-2 py-1.5 text-red-600 outline-none select-none data-highlighted:bg-neutral-100 dark:text-red-400 dark:data-highlighted:bg-neutral-700"
                  >
                    Remove…
                  </ContextMenu.Item>
                </ContextMenu.Content>
              </ContextMenu.Portal>
            </ContextMenu.Root>
          )
        })}
      </div>
    </div>
  )
}
