import { useMemo } from 'react'
import { createSelector } from '@reduxjs/toolkit'
import type { TorrentsPanelConfig, WorkspaceItem } from '@shared/types'
import type { Torrent } from '@shared/transmission'
import { useAppDispatch, useAppSelector, useActiveProfileId } from '@/app/hooks'
import { rpcApi } from '@/services/rpcApi'
import { panelConfigChanged } from '@/features/workspace/workspaceSlice'
import { defaultPanelConfig } from '@/features/workspace/panels'
import { clearSelection, setFocusedPanel } from '@/features/ui/uiSlice'
import type { RootState } from '@/app/store'
import { FilterBar } from './FilterBar'
import { ServerGroup } from './ServerGroup'

/**
 * The Torrents panel (ADR-0003): scoped to one or more servers via its
 * persisted config, rendered as one collapsible ServerGroup per daemon. Each
 * group polls independently; this component only owns scope resolution and
 * the filter bar. Aggregated filter-option counts are read from the RTK Query
 * CACHE (select, no subscription) — the groups are the subscribers.
 */
export function TorrentsPanel({ item }: { item: WorkspaceItem }): React.JSX.Element {
  const dispatch = useAppDispatch()
  const config: TorrentsPanelConfig = item.config ?? defaultPanelConfig()
  const profiles = useAppSelector((s) => s.connection.profiles)
  const defaultProfileId = useActiveProfileId()

  const scopedIds = useMemo(() => {
    if (config.servers === 'default') return defaultProfileId ? [defaultProfileId] : []
    return config.servers.filter((id) => profiles.some((p) => p.id === id))
  }, [config.servers, defaultProfileId, profiles])

  const selectAggregated = useMemo(() => {
    const inputs = scopedIds.map((id) => rpcApi.endpoints.getTorrents.select({ profileId: id }))
    return createSelector(inputs, (...results): Torrent[] =>
      results.flatMap((r) => r.data ?? [])
    )
  }, [scopedIds])
  const aggregated = useAppSelector((s: RootState) =>
    scopedIds.length ? selectAggregated(s) : []
  )

  const patch = (p: Partial<TorrentsPanelConfig>): void => {
    dispatch(panelConfigChanged({ id: item.i, patch: p }))
  }

  const toggleCollapse = (profileId: string): void => {
    const current = config.collapsedServers ?? []
    patch({
      collapsedServers: current.includes(profileId)
        ? current.filter((x) => x !== profileId)
        : [...current, profileId]
    })
  }

  const setLabelFilter = (label: string): void => {
    patch({ filters: { ...config.filters, label: config.filters.label === label ? null : label } })
  }

  return (
    <div
      className="flex h-full flex-col"
      onMouseDownCapture={() => dispatch(setFocusedPanel(item.i))}
    >
      <FilterBar
        config={config}
        patch={patch}
        profiles={profiles}
        scopedIds={scopedIds}
        aggregated={aggregated}
      />
      <div
        className="min-h-0 flex-1 overflow-y-auto"
        data-panel-rows={item.i}
        onClick={() => dispatch(clearSelection())}
      >
        {scopedIds.length === 0 ? (
          <p className="p-6 text-center text-sm text-neutral-500">
            No servers in scope — pick servers from the dropdown above
          </p>
        ) : (
          <div onClick={(e) => e.stopPropagation()}>
            {scopedIds.map((id) => (
              <ServerGroup
                key={id}
                profileId={id}
                config={config}
                showHeader={scopedIds.length > 1}
                onToggleCollapse={toggleCollapse}
                onLabelClick={setLabelFilter}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
