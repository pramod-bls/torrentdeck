import type { TorrentDetail } from '@shared/transmission'
import { useSetTorrentMutation } from '@/services/rpcApi'
import { formatBytes, formatPercent } from '@/lib/format'
import { Checkbox } from '@/components/ui/checkbox'

const PRIORITY_FIELD: Record<string, string> = {
  '-1': 'priority-low',
  '0': 'priority-normal',
  '1': 'priority-high'
}

export function FilesTab({
  torrent,
  profileId
}: {
  torrent: TorrentDetail
  profileId: string
}): React.JSX.Element {
  const [setTorrent] = useSetTorrentMutation()

  const setWanted = (index: number, wanted: boolean): void => {
    void setTorrent({
      profileId,
      ids: [torrent.id],
      fields: { [wanted ? 'files-wanted' : 'files-unwanted']: [index] }
    })
  }

  const setPriority = (index: number, priority: string): void => {
    void setTorrent({ profileId, ids: [torrent.id], fields: { [PRIORITY_FIELD[priority]]: [index] } })
  }

  if (!torrent.files.length) {
    return <p className="p-4 text-center text-sm text-neutral-500">No file metadata yet</p>
  }

  return (
    <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
      {torrent.files.map((file, i) => {
        const stat = torrent.fileStats[i]
        const progress = file.length > 0 ? file.bytesCompleted / file.length : 1
        return (
          <div key={file.name} className="flex items-center gap-2 px-3 py-2">
            <Checkbox
              checked={stat?.wanted ?? true}
              onCheckedChange={(v) => setWanted(i, v)}
              aria-label={`Download ${file.name}`}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs" title={file.name}>
                {file.name}
              </p>
              <p className="text-[11px] text-neutral-500">
                {formatBytes(file.length)} · {formatPercent(progress)}
              </p>
            </div>
            <select
              value={String(stat?.priority ?? 0)}
              onChange={(e) => setPriority(i, e.target.value)}
              aria-label={`Priority for ${file.name}`}
              className="h-6 rounded border border-neutral-300 bg-white text-xs dark:border-neutral-600 dark:bg-neutral-800"
            >
              <option value="1">High</option>
              <option value="0">Normal</option>
              <option value="-1">Low</option>
            </select>
          </div>
        )
      })}
    </div>
  )
}
