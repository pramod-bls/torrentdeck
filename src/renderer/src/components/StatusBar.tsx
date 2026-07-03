import { useEffect } from 'react'
import { ArrowDown, ArrowUp, Turtle } from 'lucide-react'
import { useAppSelector, useActiveProfileId, usePollingInterval } from '@/app/hooks'
import {
  useFreeSpaceQuery,
  useGetSessionQuery,
  useGetSessionStatsQuery,
  useSetSessionMutation
} from '@/services/rpcApi'
import { can, useServerCapabilities } from '@/features/connection/useCapabilities'
import { formatBytes } from '@/lib/format'
import { formatSpeed } from '@/lib/format'
import { cn } from '@/lib/cn'

export function StatusBar(): React.JSX.Element {
  const profileId = useActiveProfileId()!
  const pollingInterval = usePollingInterval()
  const profiles = useAppSelector((s) => s.connection.profiles)
  const profileName = profiles.find((p) => p.id === profileId)?.name
  const { data: stats } = useGetSessionStatsQuery({ profileId }, { pollingInterval })

  // Feed the tray tooltip with the default server's aggregate speeds
  useEffect(() => {
    window.api.setTraySpeeds(stats?.downloadSpeed ?? 0, stats?.uploadSpeed ?? 0)
  }, [stats?.downloadSpeed, stats?.uploadSpeed])
  const { data: session } = useGetSessionQuery({ profileId })
  const [setSession] = useSetSessionMutation()

  const caps = useServerCapabilities(profileId)
  const altOn = session?.['alt-speed-enabled'] ?? false
  const downloadDir = session?.['download-dir'] ?? ''
  const { data: freeSpace } = useFreeSpaceQuery(
    { profileId, path: downloadDir },
    { skip: !downloadDir, pollingInterval: 30_000 }
  )

  return (
    <div className="flex items-center gap-4 border-t border-warning-200/70 bg-warning-50 px-3 py-1 text-xs text-warning-900/70 dark:border-warning-900/40 dark:bg-warning-950/40 dark:text-warning-100/70">
      <span className="flex items-center gap-1 text-accent-600 dark:text-accent-400">
        <ArrowDown size={12} /> {formatSpeed(stats?.downloadSpeed ?? 0)}
      </span>
      <span className="flex items-center gap-1 text-success-600 dark:text-success-400">
        <ArrowUp size={12} /> {formatSpeed(stats?.uploadSpeed ?? 0)}
      </span>
      {can(caps, 'altSpeedScheduler') && (
        <button
          type="button"
          aria-label="Toggle alternative speed limits"
          title="Alternative speed limits"
          onClick={() => void setSession({ profileId, fields: { 'alt-speed-enabled': !altOn } })}
          className={cn(
            'flex items-center rounded px-1 py-0.5',
            altOn
              ? 'bg-warning-100 text-warning-700 dark:bg-warning-900/50 dark:text-warning-300'
              : 'hover:bg-surface-200 dark:hover:bg-surface-700'
          )}
        >
          <Turtle size={13} />
        </button>
      )}
      <span className="flex-1" />
      <span>
        {stats ? `${stats.torrentCount} torrents` : '…'}
        {freeSpace ? ` · ${formatBytes(freeSpace['size-bytes'])} free` : ''}
        {profileName ? ` · ${profileName}` : ''}
        {session ? ` · Transmission ${session.version}` : ''}
      </span>
    </div>
  )
}
