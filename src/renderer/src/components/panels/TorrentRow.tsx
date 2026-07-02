import * as ContextMenu from '@radix-ui/react-context-menu'
import { ArrowDown, ArrowUp } from 'lucide-react'
import type { Torrent } from '@shared/transmission'
import { TorrentStatus } from '@shared/transmission'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { useTorrentActionMutation } from '@/services/rpcApi'
import { statusText } from '@/features/torrents/derive'
import { openLabelsEditor, openRemoveConfirm, selectTorrent } from '@/features/ui/uiSlice'
import { formatBytes, formatEta, formatPercent, formatRatio, formatSpeed } from '@/lib/format'
import { cn } from '@/lib/cn'

export function ProgressBar({ torrent }: { torrent: Torrent }): React.JSX.Element {
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

function LabelChips({
  labels,
  onLabelClick
}: {
  labels: string[]
  onLabelClick?: (label: string) => void
}): React.JSX.Element | null {
  if (!labels.length) return null
  return (
    <span className="flex shrink-0 items-center gap-1">
      {labels.slice(0, 3).map((l) => (
        <button
          key={l}
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onLabelClick?.(l)
          }}
          className="rounded-full bg-blue-100 px-1.5 text-[10px] text-blue-700 hover:bg-blue-200 dark:bg-blue-900/50 dark:text-blue-300 dark:hover:bg-blue-900"
        >
          {l}
        </button>
      ))}
    </span>
  )
}

function RowStats({ torrent }: { torrent: Torrent }): React.JSX.Element {
  const parts: string[] = []
  const isDone = torrent.percentDone >= 1
  parts.push(
    isDone
      ? formatBytes(torrent.totalSize)
      : `${formatPercent(torrent.percentDone)} of ${formatBytes(torrent.sizeWhenDone)}`
  )
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

/**
 * One torrent as a card row, selection- and context-menu-aware. Selection is
 * server-qualified: clicking always associates the row with its profileId.
 */
export function TorrentRow({
  torrent,
  profileId,
  onLabelClick
}: {
  torrent: Torrent
  profileId: string
  onLabelClick?: (label: string) => void
}): React.JSX.Element {
  const dispatch = useAppDispatch()
  const selection = useAppSelector((s) => s.ui.selection)
  const selected = selection?.profileId === profileId && selection.ids.includes(torrent.id)
  const [torrentAction] = useTorrentActionMutation()

  const ctxIds = selected && selection ? selection.ids : [torrent.id]
  const act =
    (
      action:
        | 'torrent-start'
        | 'torrent-start-now'
        | 'torrent-stop'
        | 'torrent-verify'
        | 'torrent-reannounce'
    ) =>
    () =>
      void torrentAction({ profileId, action, ids: ctxIds })

  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger asChild>
        <div
          role="row"
          aria-selected={selected}
          onClick={(e) => {
            e.stopPropagation()
            dispatch(selectTorrent({ profileId, id: torrent.id, additive: e.metaKey || e.ctrlKey }))
          }}
          onContextMenu={() => {
            if (!selected) dispatch(selectTorrent({ profileId, id: torrent.id, additive: false }))
          }}
          className={cn(
            'flex h-14 flex-col justify-center gap-1 border-b border-neutral-100 px-3 dark:border-neutral-800',
            selected ? 'bg-blue-50 dark:bg-blue-950/40' : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/50'
          )}
        >
          <span className="flex items-center gap-2">
            <span className={cn('min-w-0 flex-1 truncate text-sm', selected && 'font-medium')}>
              {torrent.name}
            </span>
            <LabelChips labels={torrent.labels} onLabelClick={onLabelClick} />
          </span>
          <ProgressBar torrent={torrent} />
          <RowStats torrent={torrent} />
        </div>
      </ContextMenu.Trigger>
      <ContextMenu.Portal>
        <ContextMenu.Content className="z-50 min-w-44 rounded-md border border-neutral-200 bg-white p-1 text-sm shadow-lg dark:border-neutral-700 dark:bg-neutral-800">
          {(
            [
              ['Start', act('torrent-start')],
              ['Start now', act('torrent-start-now')],
              ['Pause', act('torrent-stop')],
              ['Verify local data', act('torrent-verify')],
              ['Ask tracker for more peers', act('torrent-reannounce')],
              ['Set labels…', () => dispatch(openLabelsEditor({ profileId, ids: ctxIds }))]
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
            onSelect={() => dispatch(openRemoveConfirm({ profileId, ids: ctxIds }))}
            className="rounded px-2 py-1.5 text-red-600 outline-none select-none data-highlighted:bg-neutral-100 dark:text-red-400 dark:data-highlighted:bg-neutral-700"
          >
            Remove…
          </ContextMenu.Item>
        </ContextMenu.Content>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  )
}
