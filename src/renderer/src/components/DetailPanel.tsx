/**
 * Torrent-detail panels. All variants read the selected torrent from
 * `ui.detailId` rather than taking props, so any number of detail panels on
 * the workspace stay in lockstep with the selection (ADR-0002).
 */
import * as Tabs from '@radix-ui/react-tabs'
import { MousePointerClick } from 'lucide-react'
import type { TorrentDetail } from '@shared/transmission'
import { useAppDispatch, useAppSelector, useActiveProfileId, usePollingInterval } from '@/app/hooks'
import { useGetTorrentDetailQuery } from '@/services/rpcApi'
import { setDetailTab, type UiState } from '@/features/ui/uiSlice'
import { GeneralTab } from './detail/GeneralTab'
import { FilesTab } from './detail/FilesTab'
import { PeersTab } from './detail/PeersTab'
import { TrackersTab } from './detail/TrackersTab'
import { cn } from '@/lib/cn'

const TABS: { value: UiState['detailTab']; label: string }[] = [
  { value: 'general', label: 'General' },
  { value: 'files', label: 'Files' },
  { value: 'peers', label: 'Peers' },
  { value: 'trackers', label: 'Trackers' }
]

function EmptyState({ hint }: { hint: string }): React.JSX.Element {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-neutral-400">
      <MousePointerClick size={20} />
      <p className="text-center text-xs">{hint}</p>
    </div>
  )
}

/** Fetches detail for the currently selected torrent; null when nothing is selected. */
function useSelectedTorrentDetail(): { detailId: number | null; torrent: TorrentDetail | undefined } {
  const profileId = useActiveProfileId()!
  const pollingInterval = usePollingInterval()
  const detailId = useAppSelector((s) => s.ui.detailId)
  const { data: torrent } = useGetTorrentDetailQuery(
    { profileId, id: detailId ?? 0 },
    { pollingInterval, skip: detailId === null }
  )
  return { detailId, torrent }
}

/** The classic tabbed detail view, as workspace panel content. */
export function DetailTabsPanel(): React.JSX.Element {
  const dispatch = useAppDispatch()
  const profileId = useActiveProfileId()!
  const tab = useAppSelector((s) => s.ui.detailTab)
  const { detailId, torrent } = useSelectedTorrentDetail()

  if (detailId === null) return <EmptyState hint="Select a torrent to inspect it" />

  return (
    <Tabs.Root
      value={tab}
      onValueChange={(v) => dispatch(setDetailTab(v as UiState['detailTab']))}
      className="flex h-full min-h-0 flex-col"
    >
      <Tabs.List className="flex gap-1 border-b border-neutral-200 px-2 py-1.5 dark:border-neutral-700">
        {TABS.map(({ value, label }) => (
          <Tabs.Trigger
            key={value}
            value={value}
            className={cn(
              'rounded px-2 py-1 text-xs',
              tab === value
                ? 'bg-white font-medium shadow-sm dark:bg-neutral-700'
                : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
            )}
          >
            {label}
          </Tabs.Trigger>
        ))}
      </Tabs.List>

      {!torrent ? (
        <div className="flex flex-1 items-center justify-center text-sm text-neutral-500">
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
        </div>
      )}
    </Tabs.Root>
  )
}

/** One detail tab as its own standalone panel (e.g. a dedicated Peers panel). */
export function SingleDetailTab({
  tab
}: {
  tab: 'general' | 'files' | 'peers' | 'trackers'
}): React.JSX.Element {
  const profileId = useActiveProfileId()!
  const { detailId, torrent } = useSelectedTorrentDetail()

  if (detailId === null) return <EmptyState hint="Select a torrent to inspect it" />
  if (!torrent) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-neutral-500">
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
    </div>
  )
}
