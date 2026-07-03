import { Pencil } from 'lucide-react'
import type { TorrentDetail } from '@shared/transmission'
import { useAppDispatch } from '@/app/hooks'
import { openRename } from '@/features/ui/uiSlice'
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
  const dispatch = useAppDispatch()
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
    return <p className="p-4 text-center text-sm text-surface-500">No file metadata yet</p>
  }

  return (
    <div className="divide-y divide-surface-100 dark:divide-surface-800">
      {torrent.files.map((file, i) => {
        const stat = torrent.fileStats[i]
        const progress = file.length > 0 ? file.bytesCompleted / file.length : 1
        return (
          <div key={file.name} className="group flex items-center gap-2 px-3 py-2">
            <Checkbox
              checked={stat?.wanted ?? true}
              onCheckedChange={(v) => setWanted(i, v)}
              aria-label={`Download ${file.name}`}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs" title={file.name}>
                {file.name}
              </p>
              <p className="text-[11px] text-surface-500">
                {formatBytes(file.length)} · {formatPercent(progress)}
              </p>
            </div>
            <button
              type="button"
              aria-label={`Rename ${file.name}`}
              title="Rename file on the server"
              onClick={() =>
                dispatch(
                  openRename({
                    profileId,
                    id: torrent.id,
                    path: file.name,
                    currentName: file.name.split('/').pop() ?? file.name
                  })
                )
              }
              className="rounded p-0.5 text-surface-300 opacity-0 group-hover:opacity-100 hover:bg-surface-200 hover:text-surface-700 dark:text-surface-600 dark:hover:bg-surface-700 dark:hover:text-surface-200"
            >
              <Pencil size={11} />
            </button>
            <select
              value={String(stat?.priority ?? 0)}
              onChange={(e) => setPriority(i, e.target.value)}
              aria-label={`Priority for ${file.name}`}
              className="h-6 rounded border border-surface-300 bg-surface-50 text-xs dark:border-surface-600 dark:bg-surface-800"
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
