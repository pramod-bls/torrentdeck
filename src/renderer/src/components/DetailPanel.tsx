import * as Tabs from '@radix-ui/react-tabs'
import { PanelRightClose } from 'lucide-react'
import { useAppDispatch, useAppSelector, useActiveProfileId, usePollingInterval } from '@/app/hooks'
import { useGetTorrentDetailQuery } from '@/services/rpcApi'
import { setDetailTab, toggleDetailCollapsed, type UiState } from '@/features/ui/uiSlice'
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

export function DetailPanel({ torrentId }: { torrentId: number }): React.JSX.Element {
  const dispatch = useAppDispatch()
  const profileId = useActiveProfileId()!
  const pollingInterval = usePollingInterval()
  const tab = useAppSelector((s) => s.ui.detailTab)
  const { data: torrent } = useGetTorrentDetailQuery(
    { profileId, id: torrentId },
    { pollingInterval }
  )

  return (
    <div className="flex w-96 shrink-0 flex-col border-l border-neutral-200 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800/40">
      <Tabs.Root
        value={tab}
        onValueChange={(v) => dispatch(setDetailTab(v as UiState['detailTab']))}
        className="flex min-h-0 flex-1 flex-col"
      >
        <div className="flex items-center gap-1 border-b border-neutral-200 px-2 py-1.5 dark:border-neutral-700">
          <Tabs.List className="flex gap-1">
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
          <span className="flex-1" />
          <button
            type="button"
            aria-label="Collapse detail panel"
            onClick={() => dispatch(toggleDetailCollapsed())}
            className="rounded p-1 text-neutral-500 hover:bg-neutral-200 dark:hover:bg-neutral-700"
          >
            <PanelRightClose size={14} />
          </button>
        </div>

        {!torrent ? (
          <div className="flex flex-1 items-center justify-center text-sm text-neutral-500">Loading…</div>
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
    </div>
  )
}
