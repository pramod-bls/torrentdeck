import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import type { TorrentDetail } from '@shared/transmission'
import { useGetGroupsQuery, useSetTorrentMutation } from '@/services/rpcApi'
import { can, useServerCapabilities } from '@/features/connection/useCapabilities'
import { Input } from '@/components/ui/input'
import { LabeledCheckbox } from '@/components/ui/checkbox'

const selectCls =
  'h-7 w-full rounded-md border border-surface-300 bg-surface-50 px-2 text-xs dark:border-surface-600 dark:bg-surface-800'

/**
 * Per-torrent override controls (torrent-set). Each control writes immediately
 * — Transmission's torrent-set is idempotent and cheap, and the detail poll
 * reflects the daemon's accepted value on the next cycle.
 */
export function TorrentLimits({
  torrent,
  profileId
}: {
  torrent: TorrentDetail
  profileId: string
}): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const [setTorrent] = useSetTorrentMutation()
  const caps = useServerCapabilities(profileId)
  const supportsGroups = can(caps, 'bandwidthGroups')
  const supportsSequential = can(caps, 'sequentialDownload')
  const { data: groups = [] } = useGetGroupsQuery({ profileId }, { skip: !supportsGroups })

  const set = (fields: Record<string, unknown>): void => {
    void setTorrent({ profileId, ids: [torrent.id], fields })
  }

  return (
    <div className="rounded-md border border-surface-200 dark:border-surface-700">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-1.5 px-2 py-1.5 text-xs font-medium text-surface-600 dark:text-surface-300"
      >
        {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        Speed &amp; limits
      </button>

      {open && (
        <div className="space-y-3 border-t border-surface-200 p-3 dark:border-surface-700">
          <div className="space-y-2">
            <LabeledCheckbox
              checked={torrent.downloadLimited}
              onCheckedChange={(v) => set({ downloadLimited: v })}
              label="Limit download rate (kB/s)"
            />
            <Input
              type="number"
              value={torrent.downloadLimit}
              disabled={!torrent.downloadLimited}
              onChange={(e) => set({ downloadLimit: Number(e.target.value) })}
            />
            <LabeledCheckbox
              checked={torrent.uploadLimited}
              onCheckedChange={(v) => set({ uploadLimited: v })}
              label="Limit upload rate (kB/s)"
            />
            <Input
              type="number"
              value={torrent.uploadLimit}
              disabled={!torrent.uploadLimited}
              onChange={(e) => set({ uploadLimit: Number(e.target.value) })}
            />
            <LabeledCheckbox
              checked={torrent.honorsSessionLimits}
              onCheckedChange={(v) => set({ honorsSessionLimits: v })}
              label="Honor global speed limits"
            />
            {supportsSequential && (
              <LabeledCheckbox
                checked={torrent.sequentialDownload}
                onCheckedChange={(v) => set({ sequentialDownload: v })}
                label="Download pieces sequentially (for previewing)"
              />
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <label className="space-y-1">
              <span className="text-xs text-surface-500 dark:text-surface-400">Seed until ratio</span>
              <select
                value={torrent.seedRatioMode}
                onChange={(e) => set({ seedRatioMode: Number(e.target.value) })}
                className={selectCls}
              >
                <option value={0}>Use global setting</option>
                <option value={1}>Use this ratio</option>
                <option value={2}>Seed forever</option>
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-xs text-surface-500 dark:text-surface-400">Ratio</span>
              <Input
                type="number"
                step="0.1"
                value={torrent.seedRatioLimit}
                disabled={torrent.seedRatioMode !== 1}
                onChange={(e) => set({ seedRatioLimit: Number(e.target.value) })}
              />
            </label>
            {supportsGroups && (
              <label className="space-y-1">
                <span className="text-xs text-surface-500 dark:text-surface-400">Priority</span>
                <select
                  value={torrent.bandwidthPriority}
                  onChange={(e) => set({ bandwidthPriority: Number(e.target.value) })}
                  className={selectCls}
                >
                  <option value={1}>High</option>
                  <option value={0}>Normal</option>
                  <option value={-1}>Low</option>
                </select>
              </label>
            )}
            <label className="space-y-1">
              <span className="text-xs text-surface-500 dark:text-surface-400">Max peers</span>
              <Input
                type="number"
                value={torrent['peer-limit']}
                onChange={(e) => set({ 'peer-limit': Number(e.target.value) })}
              />
            </label>
            {supportsGroups && (
              <label className="col-span-2 space-y-1">
                <span className="text-xs text-surface-500 dark:text-surface-400">Bandwidth group</span>
                <select
                  value={torrent.group}
                  onChange={(e) => set({ group: e.target.value })}
                  className={selectCls}
                >
                  <option value="">No group</option>
                  {groups.map((g) => (
                    <option key={g.name} value={g.name}>
                      {g.name}
                    </option>
                  ))}
                  {torrent.group && !groups.some((g) => g.name === torrent.group) && (
                    <option value={torrent.group}>{torrent.group}</option>
                  )}
                </select>
              </label>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
