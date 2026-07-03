import { useMemo } from 'react'
import type { SpeedGraphConfig, WorkspaceItem } from '@shared/types'
import { useAppDispatch, useAppSelector, useFirstProfileId, usePollingInterval } from '@/app/hooks'
import { useGetSessionStatsQuery } from '@/services/rpcApi'
import { panelConfigChanged } from '@/features/workspace/workspaceSlice'
import { getGraphConfig } from '@/features/workspace/panels'
import type { SpeedSample } from '@/features/stats/speedHistorySlice'
import { formatSpeed } from '@/lib/format'

const VB_W = 100
const VB_H = 40

function pathFor(
  samples: SpeedSample[],
  pick: (s: SpeedSample) => number,
  t0: number,
  t1: number,
  max: number
): { line: string; area: string } {
  if (samples.length === 0 || t1 <= t0) return { line: '', area: '' }
  const pts = samples.map((s) => {
    const x = ((s.t - t0) / (t1 - t0)) * VB_W
    const y = VB_H - (pick(s) / max) * (VB_H - 4)
    return `${x.toFixed(2)},${y.toFixed(2)}`
  })
  const line = pts.join(' ')
  const first = pts[0].split(',')[0]
  const last = pts[pts.length - 1].split(',')[0]
  return { line, area: `${first},${VB_H} ${line} ${last},${VB_H}` }
}

/**
 * Live throughput graph for one server. Pure SVG (no chart dependency):
 * download in accent, upload in success, auto-scaled to the window's peak.
 */
export function SpeedGraphPanel({ item }: { item: WorkspaceItem }): React.JSX.Element {
  const dispatch = useAppDispatch()
  const config: SpeedGraphConfig = getGraphConfig(item)
  const profiles = useAppSelector((s) => s.connection.profiles)
  const defaultProfileId = useFirstProfileId()
  const pollingInterval = usePollingInterval()

  const profileId = config.server === 'default' ? defaultProfileId : config.server
  const valid = profileId !== null && profiles.some((p) => p.id === profileId)

  // Subscribing here is what drives sampling for this server (see speedHistorySlice)
  const { data: stats } = useGetSessionStatsQuery(
    { profileId: profileId ?? '' },
    { pollingInterval, skip: !valid }
  )

  const history = useAppSelector((s) =>
    valid ? (s.speedHistory[profileId!] ?? []) : []
  ) as SpeedSample[]

  const patch = (p: Partial<SpeedGraphConfig>): void => {
    dispatch(panelConfigChanged({ id: item.i, patch: p }))
  }

  const { down, up, max } = useMemo(() => {
    const now = Date.now()
    const t0 = now - config.windowSec * 1000
    const windowed = history.filter((s) => s.t >= t0)
    const peak = Math.max(1, ...windowed.map((s) => Math.max(s.down, s.up)))
    return {
      down: pathFor(windowed, (s) => s.down, t0, now, peak),
      up: pathFor(windowed, (s) => s.up, t0, now, peak),
      max: peak
    }
  }, [history, config.windowSec])

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-1.5 border-b border-surface-200 px-2 py-1.5 dark:border-surface-700">
        <select
          value={config.server}
          onChange={(e) => patch({ server: e.target.value })}
          aria-label="Graph server"
          className="h-6 rounded border border-surface-300 bg-surface-50 px-1 text-xs dark:border-surface-600 dark:bg-surface-800"
        >
          <option value="default">First server</option>
          {profiles.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <select
          value={config.windowSec}
          onChange={(e) => patch({ windowSec: Number(e.target.value) as SpeedGraphConfig['windowSec'] })}
          aria-label="Graph window"
          className="h-6 rounded border border-surface-300 bg-surface-50 px-1 text-xs dark:border-surface-600 dark:bg-surface-800"
        >
          <option value={60}>1 min</option>
          <option value={300}>5 min</option>
          <option value={900}>15 min</option>
        </select>
        <span className="ml-auto flex items-center gap-2 text-[11px]">
          <span className="text-accent-600 dark:text-accent-400">
            ↓ {formatSpeed(stats?.downloadSpeed ?? 0)}
          </span>
          <span className="text-success-600 dark:text-success-400">
            ↑ {formatSpeed(stats?.uploadSpeed ?? 0)}
          </span>
        </span>
      </div>

      {!valid ? (
        <div className="flex flex-1 items-center justify-center text-sm text-surface-500">
          No server selected
        </div>
      ) : (
        <div className="relative min-h-0 flex-1">
          <span className="absolute top-1 left-2 text-[10px] text-surface-400">
            peak {formatSpeed(max)}
          </span>
          <svg
            viewBox={`0 0 ${VB_W} ${VB_H}`}
            preserveAspectRatio="none"
            className="h-full w-full"
            role="img"
            aria-label="Speed over time"
          >
            <line x1="0" y1={VB_H / 2} x2={VB_W} y2={VB_H / 2} className="stroke-surface-200 dark:stroke-surface-800" strokeWidth="0.3" />
            <g className="text-success-500">
              {up.area && <polygon points={up.area} fill="currentColor" opacity="0.12" />}
              {up.line && (
                <polyline points={up.line} fill="none" stroke="currentColor" strokeWidth="0.7" vectorEffect="non-scaling-stroke" />
              )}
            </g>
            <g className="text-accent-500">
              {down.area && <polygon points={down.area} fill="currentColor" opacity="0.12" />}
              {down.line && (
                <polyline points={down.line} fill="none" stroke="currentColor" strokeWidth="0.7" vectorEffect="non-scaling-stroke" />
              )}
            </g>
          </svg>
        </div>
      )}
    </div>
  )
}
