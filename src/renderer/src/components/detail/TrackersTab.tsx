import { useState } from 'react'
import { Trash2, Plus } from 'lucide-react'
import type { TorrentDetail } from '@shared/transmission'
import { useSetTorrentMutation } from '@/services/rpcApi'
import { formatDate } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function TrackersTab({
  torrent,
  profileId
}: {
  torrent: TorrentDetail
  profileId: string
}): React.JSX.Element {
  const [setTorrent] = useSetTorrentMutation()
  const [newTracker, setNewTracker] = useState('')

  const announces = torrent.trackerStats.map((t) => t.announce)

  const saveTrackerList = (list: string[]): void => {
    // trackerList: one URL per line, blank line between tiers; we keep one tier per URL
    void setTorrent({
      profileId,
      ids: [torrent.id],
      fields: { trackerList: list.join('\n\n') }
    })
  }

  const addTracker = (): void => {
    const url = newTracker.trim()
    if (!url || announces.includes(url)) return
    saveTrackerList([...announces, url])
    setNewTracker('')
  }

  return (
    <div className="space-y-3 p-3">
      <div className="divide-y divide-surface-100 dark:divide-surface-800">
        {torrent.trackerStats.map((t) => (
          <div key={t.id} className="flex items-start gap-2 py-2">
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium" title={t.announce}>
                {t.host || t.announce}
              </p>
              <p className="text-[11px] text-surface-500">
                {t.lastAnnounceSucceeded
                  ? `OK · ${t.seederCount >= 0 ? `${t.seederCount} seeders` : 'seeders n/a'} · ${
                      t.leecherCount >= 0 ? `${t.leecherCount} leechers` : 'leechers n/a'
                    }`
                  : t.lastAnnounceResult || 'No announce yet'}
              </p>
              {t.lastAnnounceTime > 0 && (
                <p className="text-[11px] text-surface-400">
                  Last announce {formatDate(t.lastAnnounceTime)}
                </p>
              )}
            </div>
            <button
              type="button"
              aria-label={`Remove tracker ${t.host}`}
              onClick={() => saveTrackerList(announces.filter((a) => a !== t.announce))}
              className="rounded p-1 text-surface-400 hover:bg-surface-200 hover:text-danger-600 dark:hover:bg-surface-700"
            >
              <Trash2 size={13} />
            </button>
          </div>
        ))}
        {!torrent.trackerStats.length && (
          <p className="py-4 text-center text-sm text-surface-500">No trackers</p>
        )}
      </div>

      <div className="flex gap-1.5">
        <Input
          value={newTracker}
          onChange={(e) => setNewTracker(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addTracker()}
          placeholder="udp://tracker.example.com:6969/announce"
        />
        <Button variant="secondary" size="sm" onClick={addTracker} disabled={!newTracker.trim()}>
          <Plus size={13} /> Add
        </Button>
      </div>
    </div>
  )
}
