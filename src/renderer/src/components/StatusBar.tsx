import { useEffect, useState } from 'react'
import { ArrowDown, ArrowUp, Turtle } from 'lucide-react'
import { useAppSelector, usePollingInterval } from '@/app/hooks'
import {
  useFreeSpaceQuery,
  useGetSessionQuery,
  useGetSessionStatsQuery,
  useSetSessionMutation
} from '@/services/rpcApi'
import { can, useServerCapabilities } from '@/features/connection/useCapabilities'
import { formatBytes, formatSpeed } from '@/lib/format'
import { cn } from '@/lib/cn'

const STATUS_SERVER_KEY = 'statusBarServerId'

/** The bottom bar reads one server (its own pick, remembered across restarts). */
export function StatusBar(): React.JSX.Element {
  const pollingInterval = usePollingInterval()
  const profiles = useAppSelector((s) => s.connection.profiles)
  const [picked, setPicked] = useState<string | null>(() => localStorage.getItem(STATUS_SERVER_KEY))
  const profileId = profiles.some((p) => p.id === picked) ? (picked as string) : profiles[0]?.id
  const valid = Boolean(profileId)

  const { data: stats } = useGetSessionStatsQuery({ profileId: profileId ?? '' }, { pollingInterval, skip: !valid })
  const { data: session } = useGetSessionQuery({ profileId: profileId ?? '' }, { skip: !valid })
  const [setSession] = useSetSessionMutation()
  const caps = useServerCapabilities(profileId)

  // Feed the tray tooltip with the selected server's speeds
  useEffect(() => {
    window.api.setTraySpeeds(stats?.downloadSpeed ?? 0, stats?.uploadSpeed ?? 0)
  }, [stats?.downloadSpeed, stats?.uploadSpeed])

  const changeServer = (id: string): void => {
    setPicked(id)
    localStorage.setItem(STATUS_SERVER_KEY, id)
  }

  const altOn = session?.['alt-speed-enabled'] ?? false
  const downloadDir = session?.['download-dir'] ?? ''
  const { data: freeSpace } = useFreeSpaceQuery(
    { profileId: profileId ?? '', path: downloadDir },
    { skip: !valid || !downloadDir, pollingInterval: 30_000 }
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
          onClick={() => profileId && void setSession({ profileId, fields: { 'alt-speed-enabled': !altOn } })}
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
      </span>
      {profiles.length > 1 ? (
        <select
          value={profileId}
          onChange={(e) => changeServer(e.target.value)}
          aria-label="Status bar server"
          className="h-5 rounded border border-warning-200/60 bg-transparent px-1 text-xs dark:border-warning-900/40"
        >
          {profiles.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      ) : (
        <span>{profiles[0]?.name}</span>
      )}
    </div>
  )
}
