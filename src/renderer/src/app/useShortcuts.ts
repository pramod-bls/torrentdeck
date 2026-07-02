/**
 * Application keyboard shortcuts (one window-level keydown listener).
 *
 * List-navigation keys operate on the FOCUSED Torrents panel and recompute
 * its visible rows exactly as rendered: scope order → per-group filter+sort,
 * collapsed groups skipped. Because selection is server-qualified (ADR-0003),
 * arrow keys may cross group boundaries (moving re-anchors to the new
 * server), while ⇧-extension and ⌘A stay within one server's group.
 */
import { useEffect } from 'react'
import { useStore } from 'react-redux'
import type { TorrentsPanelConfig, WorkspaceItem } from '@shared/types'
import type { Torrent } from '@shared/transmission'
import { TorrentStatus } from '@shared/transmission'
import type { AppDispatch, RootState } from './store'
import { rpcApi } from '@/services/rpcApi'
import { applyPanelFilters, sortTorrents } from '@/features/torrents/derive'
import {
  clearSelection,
  openAddTorrent,
  openRemoveConfirm,
  selectMany,
  selectTorrent,
  setPrefsOpen
} from '@/features/ui/uiSlice'
import { useAppDispatch } from './hooks'

interface RowRef {
  profileId: string
  torrent: Torrent
}

function focusedListPanel(state: RootState): WorkspaceItem | null {
  const items = state.workspace.layout?.items ?? []
  const focused = items.find(
    (it) => it.i === state.ui.focusedPanelId && it.type === 'torrent-list'
  )
  return focused ?? items.find((it) => it.type === 'torrent-list') ?? null
}

function scopedProfileIds(state: RootState, config: TorrentsPanelConfig): string[] {
  if (config.servers === 'default') {
    return state.connection.activeProfileId ? [state.connection.activeProfileId] : []
  }
  return config.servers.filter((id) => state.connection.profiles.some((p) => p.id === id))
}

/** The panel's rows exactly as displayed, flattened across server groups. */
function visibleRows(state: RootState, panel: WorkspaceItem): RowRef[] {
  const config = panel.config
  if (!config) return []
  const rows: RowRef[] = []
  for (const profileId of scopedProfileIds(state, config)) {
    if (config.collapsedServers?.includes(profileId)) continue
    const cached = rpcApi.endpoints.getTorrents.select({ profileId })(state).data ?? []
    for (const t of sortTorrents(applyPanelFilters(cached, config.filters), config.sort)) {
      rows.push({ profileId, torrent: t })
    }
  }
  return rows
}

function anyDialogOpen(state: RootState): boolean {
  const ui = state.ui
  return (
    ui.addTorrent !== null ||
    ui.profileEditorId !== undefined ||
    ui.removeConfirm !== null ||
    ui.labelsEditor !== null ||
    ui.sessionSettingsOpen ||
    ui.prefsOpen ||
    ui.shortcutsOpen
  )
}

function scrollRowIntoView(profileId: string, id: number): void {
  requestAnimationFrame(() => {
    document
      .querySelector(`[data-rowid="${profileId}:${id}"]`)
      ?.scrollIntoView({ block: 'nearest' })
  })
}

export function useShortcuts(): void {
  const dispatch = useAppDispatch()
  const store = useStore<RootState>()

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent): void => {
      const state = store.getState()
      const target = e.target as HTMLElement
      const inEditable =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        target.isContentEditable
      const mod = e.metaKey || e.ctrlKey

      if (anyDialogOpen(state)) return
      if (inEditable) {
        if (e.key === 'Escape') target.blur()
        return
      }

      // Global shortcuts
      if (mod && e.key === 'n') {
        e.preventDefault()
        dispatch(openAddTorrent({ magnet: '' }))
        return
      }
      if (mod && e.key === 'o') {
        e.preventDefault()
        void window.api.pickTorrentFiles().then((files) => {
          if (files.length) dispatch(openAddTorrent({ files }))
        })
        return
      }
      if (mod && e.key === ',') {
        e.preventDefault()
        dispatch(setPrefsOpen(true))
        return
      }

      const panel = focusedListPanel(state)
      if (!panel) return

      if (mod && e.key === 'f') {
        e.preventDefault()
        document
          .querySelector<HTMLInputElement>(`[data-panel-id="${panel.i}"] [data-panel-search]`)
          ?.focus()
        return
      }

      const selection = state.ui.selection
      const rows = visibleRows(state, panel)

      if (mod && e.key === 'a') {
        e.preventDefault()
        // Select all within one server: the selection's server, else the first group
        const profileId = selection?.profileId ?? rows[0]?.profileId
        if (!profileId) return
        const ids = rows.filter((r) => r.profileId === profileId).map((r) => r.torrent.id)
        dispatch(selectMany({ profileId, ids }))
        return
      }

      if (e.key === 'Escape') {
        dispatch(clearSelection())
        return
      }

      if (e.key === ' ') {
        if (!selection) return
        e.preventDefault()
        const cached =
          rpcApi.endpoints.getTorrents.select({ profileId: selection.profileId })(state).data ?? []
        const selected = cached.filter((t) => selection.ids.includes(t.id))
        const allStopped = selected.every((t) => t.status === TorrentStatus.Stopped)
        void (dispatch as AppDispatch)(
          rpcApi.endpoints.torrentAction.initiate({
            profileId: selection.profileId,
            action: allStopped ? 'torrent-start' : 'torrent-stop',
            ids: selection.ids
          })
        )
        return
      }

      if (e.key === 'Delete' || (mod && e.key === 'Backspace')) {
        if (!selection) return
        e.preventDefault()
        dispatch(openRemoveConfirm(selection))
        return
      }

      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault()
        if (rows.length === 0) return
        const dir = e.key === 'ArrowDown' ? 1 : -1
        const anchor = state.ui.detailTarget
        const anchorIdx = anchor
          ? rows.findIndex((r) => r.profileId === anchor.profileId && r.torrent.id === anchor.id)
          : -1
        const nextIdx =
          anchorIdx === -1
            ? dir === 1
              ? 0
              : rows.length - 1
            : Math.min(rows.length - 1, Math.max(0, anchorIdx + dir))
        const next = rows[nextIdx]
        if (e.shiftKey && selection && next.profileId === selection.profileId) {
          const ids = selection.ids.includes(next.torrent.id)
            ? selection.ids
            : [...selection.ids, next.torrent.id]
          dispatch(selectMany({ profileId: next.profileId, ids }))
        } else {
          dispatch(
            selectTorrent({ profileId: next.profileId, id: next.torrent.id, additive: false })
          )
        }
        scrollRowIntoView(next.profileId, next.torrent.id)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [dispatch, store])
}
