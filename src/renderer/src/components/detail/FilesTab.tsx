import { useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, Pencil } from 'lucide-react'
import type { TorrentDetail } from '@shared/transmission'
import { useAppDispatch } from '@/app/hooks'
import { openRename } from '@/features/ui/uiSlice'
import { useSetTorrentMutation } from '@/services/rpcApi'
import {
  buildFileTree,
  collectIndices,
  folderProgress,
  folderSize,
  folderWanted,
  type TreeNode
} from '@/lib/fileTree'
import { formatBytes, formatPercent } from '@/lib/format'
import { Checkbox } from '@/components/ui/checkbox'

const PRIORITY_FIELD: Record<string, string> = {
  '-1': 'priority-low',
  '0': 'priority-normal',
  '1': 'priority-high'
}

const prioritySelectCls =
  'h-6 rounded border border-surface-300 bg-surface-50 text-xs dark:border-surface-600 dark:bg-surface-800'

/**
 * Files as a collapsible directory tree. Folder controls fan out to every
 * descendant file index (torrent-set takes an array of indices), so toggling
 * a folder's "wanted" or priority applies to its whole subtree in one call.
 */
export function FilesTab({
  torrent,
  profileId
}: {
  torrent: TorrentDetail
  profileId: string
}): React.JSX.Element {
  const dispatch = useAppDispatch()
  const [setTorrent] = useSetTorrentMutation()
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  const tree = useMemo(
    () => buildFileTree(torrent.files, torrent.fileStats),
    [torrent.files, torrent.fileStats]
  )

  const setWanted = (indices: number[], wanted: boolean): void => {
    void setTorrent({
      profileId,
      ids: [torrent.id],
      fields: { [wanted ? 'files-wanted' : 'files-unwanted']: indices }
    })
  }
  const setPriority = (indices: number[], priority: string): void => {
    void setTorrent({ profileId, ids: [torrent.id], fields: { [PRIORITY_FIELD[priority]]: indices } })
  }
  const toggleCollapse = (path: string): void =>
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })

  if (!torrent.files.length) {
    return <p className="p-4 text-center text-sm text-surface-500">No file metadata yet</p>
  }

  const renderNode = (node: TreeNode, depth: number): React.JSX.Element => {
    const pad = { paddingLeft: `${depth * 16 + 12}px` }

    if (node.kind === 'dir') {
      const wanted = folderWanted(node)
      const isCollapsed = collapsed.has(node.path)
      const indices = collectIndices(node)
      return (
        <div key={`d:${node.path}`}>
          <div className="flex items-center gap-2 py-1.5 pr-3" style={pad}>
            <Checkbox
              checked={wanted !== 'none'}
              onCheckedChange={(v) => setWanted(indices, v)}
              aria-label={`Download folder ${node.name}`}
              className={wanted === 'some' ? 'opacity-60' : ''}
            />
            <button
              type="button"
              onClick={() => toggleCollapse(node.path)}
              className="flex min-w-0 flex-1 items-center gap-1 text-left"
            >
              {isCollapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
              <span className="truncate text-xs font-medium">{node.name}</span>
              <span className="shrink-0 text-[11px] text-surface-400">
                {formatBytes(folderSize(node))} · {formatPercent(folderProgress(node))}
              </span>
            </button>
            <select
              value=""
              onChange={(e) => e.target.value && setPriority(indices, e.target.value)}
              aria-label={`Priority for folder ${node.name}`}
              className={prioritySelectCls}
            >
              <option value="">Priority…</option>
              <option value="1">High</option>
              <option value="0">Normal</option>
              <option value="-1">Low</option>
            </select>
          </div>
          {!isCollapsed && node.children.map((c) => renderNode(c, depth + 1))}
        </div>
      )
    }

    const progress = node.length > 0 ? node.bytesCompleted / node.length : 1
    return (
      <div key={`f:${node.index}`} className="group flex items-center gap-2 py-1.5 pr-3" style={pad}>
        <Checkbox
          checked={node.wanted}
          onCheckedChange={(v) => setWanted([node.index], v)}
          aria-label={`Download ${node.name}`}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs" title={node.name}>
            {node.name}
          </p>
          <p className="text-[11px] text-surface-500">
            {formatBytes(node.length)} · {formatPercent(progress)}
          </p>
        </div>
        <button
          type="button"
          aria-label={`Rename ${node.name}`}
          title="Rename file on the server"
          onClick={() =>
            dispatch(
              openRename({
                profileId,
                id: torrent.id,
                path: torrent.files[node.index].name,
                currentName: node.name
              })
            )
          }
          className="rounded p-0.5 text-surface-300 opacity-0 group-hover:opacity-100 hover:bg-surface-200 hover:text-surface-700 dark:text-surface-600 dark:hover:bg-surface-700 dark:hover:text-surface-200"
        >
          <Pencil size={11} />
        </button>
        <select
          value={String(node.priority)}
          onChange={(e) => setPriority([node.index], e.target.value)}
          aria-label={`Priority for ${node.name}`}
          className={prioritySelectCls}
        >
          <option value="1">High</option>
          <option value="0">Normal</option>
          <option value="-1">Low</option>
        </select>
      </div>
    )
  }

  return <div className="divide-y divide-surface-100 dark:divide-surface-800">{tree.map((n) => renderNode(n, 0))}</div>
}
