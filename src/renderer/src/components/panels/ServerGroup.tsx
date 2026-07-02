import { ChevronDown, ChevronRight, ServerCrash } from 'lucide-react'
import type { TorrentsPanelConfig } from '@shared/types'
import { useAppSelector, usePollingInterval } from '@/app/hooks'
import { useGetTorrentsQuery } from '@/services/rpcApi'
import { applyPanelFilters, sortTorrents } from '@/features/torrents/derive'
import { TorrentRow } from './TorrentRow'
import { cn } from '@/lib/cn'

/**
 * Rows are intentionally NOT virtualized since grouping split the list across
 * several independent queries; a render cap keeps pathological lists cheap.
 * If this ever matters in practice, the fix is per-group virtualizers sharing
 * the panel scroll element via scrollMargin.
 */
const ROW_RENDER_CAP = 400

/**
 * One server's section inside a Torrents panel: fetches (and polls) that
 * daemon's torrents, applies the PANEL's filters/sort, and renders a
 * collapsible group. Each ServerGroup owns its own query, so one unreachable
 * daemon degrades only its own section.
 */
export function ServerGroup({
  profileId,
  config,
  showHeader,
  onToggleCollapse,
  onLabelClick
}: {
  profileId: string
  config: TorrentsPanelConfig
  showHeader: boolean
  onToggleCollapse: (profileId: string) => void
  onLabelClick: (label: string) => void
}): React.JSX.Element {
  const pollingInterval = usePollingInterval()
  const profileName = useAppSelector(
    (s) => s.connection.profiles.find((p) => p.id === profileId)?.name ?? profileId
  )
  const { data: torrents = [], error, isLoading } = useGetTorrentsQuery(
    { profileId },
    { pollingInterval }
  )
  const collapsed = config.collapsedServers?.includes(profileId) ?? false

  const visible = sortTorrents(applyPanelFilters(torrents, config.filters), config.sort)

  return (
    <div>
      {showHeader && (
        <button
          type="button"
          onClick={() => onToggleCollapse(profileId)}
          className="sticky top-0 z-10 flex w-full items-center gap-1.5 border-b border-neutral-200 bg-neutral-100 px-2 py-1 text-left text-xs font-semibold text-neutral-600 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
        >
          {collapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
          <span className="truncate">{profileName}</span>
          <span className="font-normal text-neutral-400">
            {error ? '' : `${visible.length}${visible.length !== torrents.length ? ` of ${torrents.length}` : ''}`}
          </span>
          {error && <ServerCrash size={12} className="text-red-500" />}
        </button>
      )}

      {!collapsed && (
        <>
          {error ? (
            <div className="flex items-center gap-2 px-3 py-3 text-xs text-red-600 dark:text-red-400">
              <ServerCrash size={14} className="shrink-0" />
              <span>
                Can't reach {profileName}
                {'message' in error ? ` — ${error.message}` : ''}
              </span>
            </div>
          ) : isLoading ? (
            <p className="px-3 py-3 text-xs text-neutral-500">Loading…</p>
          ) : visible.length === 0 ? (
            <p className={cn('px-3 py-3 text-xs text-neutral-500', !showHeader && 'py-6 text-center')}>
              {torrents.length === 0 ? 'No torrents' : 'Nothing matches the filters'}
            </p>
          ) : (
            <>
              {visible.slice(0, ROW_RENDER_CAP).map((t) => (
                <TorrentRow key={t.id} torrent={t} profileId={profileId} onLabelClick={onLabelClick} />
              ))}
              {visible.length > ROW_RENDER_CAP && (
                <p className="px-3 py-2 text-center text-xs text-neutral-400">
                  Showing {ROW_RENDER_CAP} of {visible.length} — narrow the filters to see the rest
                </p>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}
