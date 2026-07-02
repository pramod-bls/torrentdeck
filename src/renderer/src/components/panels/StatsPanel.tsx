import { useActiveProfileId, usePollingInterval } from '@/app/hooks'
import { useGetSessionStatsQuery } from '@/services/rpcApi'
import { formatBytes, formatSpeed } from '@/lib/format'

function Stat({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <div className="rounded-md bg-neutral-100 px-3 py-2 dark:bg-neutral-800">
      <p className="text-[11px] text-neutral-500 dark:text-neutral-400">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  )
}

/** Aggregate daemon statistics for the Active Server. */
export function StatsPanel(): React.JSX.Element {
  const profileId = useActiveProfileId()!
  const pollingInterval = usePollingInterval()
  const { data: stats } = useGetSessionStatsQuery({ profileId }, { pollingInterval })

  if (!stats) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-neutral-500">
        Loading…
      </div>
    )
  }

  const cum = stats['cumulative-stats']
  const cur = stats['current-stats']
  const ratio = cum.downloadedBytes > 0 ? (cum.uploadedBytes / cum.downloadedBytes).toFixed(2) : '—'

  return (
    <div className="grid grid-cols-2 gap-2 overflow-y-auto p-3">
      <Stat label="Download" value={`${formatSpeed(stats.downloadSpeed)}`} />
      <Stat label="Upload" value={`${formatSpeed(stats.uploadSpeed)}`} />
      <Stat label="Active torrents" value={String(stats.activeTorrentCount)} />
      <Stat label="Paused torrents" value={String(stats.pausedTorrentCount)} />
      <Stat label="Session downloaded" value={formatBytes(cur.downloadedBytes)} />
      <Stat label="Session uploaded" value={formatBytes(cur.uploadedBytes)} />
      <Stat label="All-time downloaded" value={formatBytes(cum.downloadedBytes)} />
      <Stat label="All-time uploaded" value={formatBytes(cum.uploadedBytes)} />
      <div className="col-span-2">
        <Stat label="All-time ratio" value={ratio} />
      </div>
    </div>
  )
}
