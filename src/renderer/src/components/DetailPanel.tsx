/**
 * Torrent-detail panels. All variants read the selected torrent from
 * `ui.detailId` rather than taking props, so any number of detail panels on
 * the workspace stay in lockstep with the selection (ADR-0002).
 */
import * as Tabs from '@radix-ui/react-tabs'
import { MousePointerClick } from 'lucide-react'
import type { TorrentDetail } from '@shared/transmission'
import { useAppDispatch, useAppSelector, usePollingInterval } from '@/app/hooks'
import { useGetTorrentDetailQuery } from '@/services/rpcApi'
import { setDetailTab, type UiState } from '@/features/ui/uiSlice'
import { GeneralTab } from './detail/GeneralTab'
import { FilesTab } from './detail/FilesTab'
import { PeersTab } from './detail/PeersTab'
import { TrackersTab } from './detail/TrackersTab'
import { PiecesMap } from './detail/PiecesMap'
import { cn } from '@/lib/cn'

const TABS: { value: UiState['detailTab']; label: string }[] = [
  { value: 'general', label: 'General' },
  { value: 'files', label: 'Files' },
  { value: 'peers', label: 'Peers' },
  { value: 'trackers', label: 'Trackers' },
  { value: 'pieces', label: 'Pieces' }
]

function EmptyState({ hint }: { hint: string }): React.JSX.Element {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-surface-400">
      <MousePointerClick size={20} />
      <p className="text-center text-xs">{hint}</p>
    </div>
  )
}

/**
 * Fetches detail for the currently selected torrent. The target is
 * server-qualified (ADR-0003): selection in ANY panel drives this, no matter
 * which daemon the torrent lives on.
 */
function useSelectedTorrentDetail(): {
  target: { profileId: string; id: number } | null
  torrent: TorrentDetail | undefined
} {
  const pollingInterval = usePollingInterval()
  const target = useAppSelector((s) => s.ui.detailTarget)
  const { data: torrent } = useGetTorrentDetailQuery(
    { profileId: target?.profileId ?? '', id: target?.id ?? 0 },
    { pollingInterval, skip: target === null }
  )
  return { target, torrent }
}

/** The classic tabbed detail view, as workspace panel content. */
export function DetailTabsPanel(): React.JSX.Element {
  const dispatch = useAppDispatch()
  const tab = useAppSelector((s) => s.ui.detailTab)
  const { target, torrent } = useSelectedTorrentDetail()

  if (target === null) return <EmptyState hint="Select a torrent to inspect it" />
  const profileId = target.profileId

  return (
    <Tabs.Root
      value={tab}
      onValueChange={(v) => dispatch(setDetailTab(v as UiState['detailTab']))}
      className="flex h-full min-h-0 flex-col"
    >
      <Tabs.List className="flex gap-1 border-b border-surface-200 px-2 py-1.5 dark:border-surface-700">
        {TABS.map(({ value, label }) => (
          <Tabs.Trigger
            key={value}
            value={value}
            className={cn(
              'rounded px-2 py-1 text-xs',
              tab === value
                ? 'bg-surface-50 font-medium shadow-sm dark:bg-surface-700'
                : 'text-surface-500 hover:text-surface-800 dark:hover:text-surface-200'
            )}
          >
            {label}
          </Tabs.Trigger>
        ))}
      </Tabs.List>

      {!torrent ? (
        <div className="flex flex-1 items-center justify-center text-sm text-surface-500">
          Loading…
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <Tabs.Content value="general">
            <GeneralTab torrent={torrent} profileId={profileId} />
          </Tabs.Content>
          <Tabs.Content value="files">
            <FilesTab torrent={torrent} profileId={profileId} />
          </Tabs.Content>
          <Tabs.Content value="peers">
            <PeersTab torrent={torrent} />
          </Tabs.Content>
          <Tabs.Content value="trackers">
            <TrackersTab torrent={torrent} profileId={profileId} />
          </Tabs.Content>
          <Tabs.Content value="pieces">
            <div className="p-3">
              <PiecesMap pieces={torrent.pieces} pieceCount={torrent.pieceCount} availability={torrent.availability} mode="grid" />
            </div>
          </Tabs.Content>
        </div>
      )}
    </Tabs.Root>
  )
}

/** One detail tab as its own standalone panel (e.g. a dedicated Peers panel). */
export function SingleDetailTab({
  tab
}: {
  tab: 'general' | 'files' | 'peers' | 'trackers' | 'pieces'
}): React.JSX.Element {
  const { target, torrent } = useSelectedTorrentDetail()

  if (target === null) return <EmptyState hint="Select a torrent to inspect it" />
  const profileId = target.profileId
  if (!torrent) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-surface-500">
        Loading…
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto">
      {tab === 'general' && <GeneralTab torrent={torrent} profileId={profileId} />}
      {tab === 'files' && <FilesTab torrent={torrent} profileId={profileId} />}
      {tab === 'peers' && <PeersTab torrent={torrent} />}
      {tab === 'trackers' && <TrackersTab torrent={torrent} profileId={profileId} />}
      {tab === 'pieces' && (
        <div className="p-3">
          <PiecesMap pieces={torrent.pieces} pieceCount={torrent.pieceCount} availability={torrent.availability} mode="grid" />
        </div>
      )}
    </div>
  )
}
