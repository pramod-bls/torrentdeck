/**
 * Download-completion detection and native notifications. A pure detector
 * compares consecutive torrent-get snapshots per server; the listener fires a
 * renderer Notification for each newly finished download. The first snapshot
 * after connect produces nothing (no prev), so restarts never re-notify.
 */
import { createListenerMiddleware } from '@reduxjs/toolkit'
import type { Torrent } from '@shared/transmission'
import { rpcApi } from '@/services/rpcApi'
import { selectTorrent } from '@/features/ui/uiSlice'
import type { AppPrefs, ServerProfile } from '@shared/types'

export interface Completion {
  id: number
  name: string
}

export function findCompletions(prev: Torrent[] | undefined, next: Torrent[]): Completion[] {
  if (!prev) return []
  const prevLeft = new Map(prev.map((t) => [t.id, t.leftUntilDone]))
  return next
    .filter((t) => {
      const before = prevLeft.get(t.id)
      return before !== undefined && before > 0 && t.leftUntilDone === 0 && t.percentDone >= 1
    })
    .map((t) => ({ id: t.id, name: t.name }))
}

const prevSnapshots = new Map<string, Torrent[]>()

export const completionNotifierMiddleware = createListenerMiddleware()
completionNotifierMiddleware.startListening({
  matcher: rpcApi.endpoints.getTorrents.matchFulfilled,
  effect: (action, api) => {
    const profileId = action.meta.arg.originalArgs.profileId
    const completions = findCompletions(prevSnapshots.get(profileId), action.payload)
    prevSnapshots.set(profileId, action.payload)
    if (!completions.length) return

    const state = api.getState() as {
      connection: { prefs: AppPrefs; profiles: ServerProfile[] }
    }
    if (state.connection.prefs.notifyOnComplete === false) return
    const serverName = state.connection.profiles.find((p) => p.id === profileId)?.name ?? 'server'

    for (const c of completions) {
      const n = new Notification('Download complete', { body: `${c.name} — ${serverName}` })
      n.onclick = () => {
        void window.api.focusWindow()
        api.dispatch(selectTorrent({ profileId, id: c.id, additive: false }))
      }
    }
  }
})
