import type { StatsPanelConfig, WorkspaceItem } from '@shared/types'
import { useAppDispatch, useAppSelector, useFirstProfileId, usePollingInterval } from '@/app/hooks'
import { useFreeSpaceQuery, useGetSessionQuery, useGetSessionStatsQuery } from '@/services/rpcApi'
import { panelConfigChanged } from '@/features/workspace/workspaceSlice'
import { getStatsConfig } from '@/features/workspace/panels'
import { formatBytes, formatSpeed } from '@/lib/format'

function Stat({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <div className="rounded-md bg-surface-100 px-3 py-2 dark:bg-surface-800">
      <p className="text-[11px] text-surface-500 dark:text-surface-400">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  )
}

/** Aggregate daemon statistics for a chosen server (defaults to the current server). */
export function StatsPanel({ item }: { item: WorkspaceItem }): React.JSX.Element {
  const dispatch = useAppDispatch()
  const config: StatsPanelConfig = getStatsConfig(item)
  const profiles = useAppSelector((s) => s.connection.profiles)
  const defaultProfileId = useFirstProfileId()
  const pollingInterval = usePollingInterval()

  const profileId = config.server === 'default' ? defaultProfileId : config.server
  const valid = profileId !== null && profiles.some((p) => p.id === profileId)

  const { data: stats } = useGetSessionStatsQuery(
    { profileId: profileId ?? '' },
    { pollingInterval, skip: !valid }
  )
  const { data: session } = useGetSessionQuery({ profileId: profileId ?? '' }, { skip: !valid })
  const downloadDir = session?.['download-dir'] ?? ''
  const { data: freeSpace } = useFreeSpaceQuery(
    { profileId: profileId ?? '', path: downloadDir },
    { skip: !valid || !downloadDir, pollingInterval: 30_000 }
  )

  const cum = stats?.['cumulative-stats']
  const cur = stats?.['current-stats']
  const ratio =
    cum && cum.downloadedBytes > 0 ? (cum.uploadedBytes / cum.downloadedBytes).toFixed(2) : '—'

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-1.5 border-b border-surface-200 px-2 py-1.5 dark:border-surface-700">
        <select
          value={config.server}
          onChange={(e) => dispatch(panelConfigChanged({ id: item.i, patch: { server: e.target.value } }))}
          aria-label="Stats server"
          className="h-6 rounded border border-surface-300 bg-surface-50 px-1 text-xs dark:border-surface-600 dark:bg-surface-800"
        >
          <option value="default">First server</option>
          {profiles.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {!valid ? (
        <div className="flex flex-1 items-center justify-center text-sm text-surface-500">
          No server selected
        </div>
      ) : !stats || !cum || !cur ? (
        <div className="flex flex-1 items-center justify-center text-sm text-surface-500">Loading…</div>
      ) : (
        <div className="grid grid-cols-2 gap-2 overflow-y-auto p-3">
          <Stat label="Download" value={`${formatSpeed(stats.downloadSpeed)}`} />
          <Stat label="Upload" value={`${formatSpeed(stats.uploadSpeed)}`} />
          <Stat label="Active torrents" value={String(stats.activeTorrentCount)} />
          <Stat label="Paused torrents" value={String(stats.pausedTorrentCount)} />
          <Stat label="Session downloaded" value={formatBytes(cur.downloadedBytes)} />
          <Stat label="Session uploaded" value={formatBytes(cur.uploadedBytes)} />
          <Stat label="All-time downloaded" value={formatBytes(cum.downloadedBytes)} />
          <Stat label="All-time uploaded" value={formatBytes(cum.uploadedBytes)} />
          <Stat label="All-time ratio" value={ratio} />
          <Stat
            label={`Free space${downloadDir ? ` · ${downloadDir}` : ''}`}
            value={freeSpace ? formatBytes(freeSpace['size-bytes']) : '—'}
          />
        </div>
      )}
    </div>
  )
}
