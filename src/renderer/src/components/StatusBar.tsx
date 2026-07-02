import { ArrowDown, ArrowUp, Turtle } from 'lucide-react'
import { useAppSelector, useActiveProfileId, usePollingInterval } from '@/app/hooks'
import {
  useGetSessionQuery,
  useGetSessionStatsQuery,
  useSetSessionMutation
} from '@/services/rpcApi'
import { formatSpeed } from '@/lib/format'
import { cn } from '@/lib/cn'

export function StatusBar(): React.JSX.Element {
  const profileId = useActiveProfileId()!
  const pollingInterval = usePollingInterval()
  const profiles = useAppSelector((s) => s.connection.profiles)
  const profileName = profiles.find((p) => p.id === profileId)?.name
  const { data: stats } = useGetSessionStatsQuery({ profileId }, { pollingInterval })
  const { data: session } = useGetSessionQuery({ profileId })
  const [setSession] = useSetSessionMutation()

  const altOn = session?.['alt-speed-enabled'] ?? false

  return (
    <div className="flex items-center gap-4 border-t border-neutral-200 bg-neutral-50 px-3 py-1 text-xs text-neutral-600 dark:border-neutral-700 dark:bg-neutral-800/60 dark:text-neutral-400">
      <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
        <ArrowDown size={12} /> {formatSpeed(stats?.downloadSpeed ?? 0)}
      </span>
      <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
        <ArrowUp size={12} /> {formatSpeed(stats?.uploadSpeed ?? 0)}
      </span>
      <button
        type="button"
        aria-label="Toggle alternative speed limits"
        title="Alternative speed limits"
        onClick={() => void setSession({ profileId, fields: { 'alt-speed-enabled': !altOn } })}
        className={cn(
          'flex items-center rounded px-1 py-0.5',
          altOn
            ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300'
            : 'hover:bg-neutral-200 dark:hover:bg-neutral-700'
        )}
      >
        <Turtle size={13} />
      </button>
      <span className="flex-1" />
      <span>
        {stats ? `${stats.torrentCount} torrents` : '…'}
        {profileName ? ` · ${profileName}` : ''}
        {session ? ` · Transmission ${session.version}` : ''}
      </span>
    </div>
  )
}
