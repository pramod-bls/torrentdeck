import { useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, Pencil } from 'lucide-react'
import type { TorrentDetail } from '@shared/transmission'
import { MB, unwantedBySizeThreshold } from '@shared/sizeFilter'
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
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const PRIORITY_FIELD: Record<string, string> = {
  '-1': 'priority-low',
  '0': 'priority-normal',
  '1': 'priority-high'
}

const prioritySelectCls =
  'h-6 rounded border border-surface-300 bg-surface-50 text-xs dark:border-surface-600 dark:bg-surface-800'

/** Log-ish snap stops for the size slider, in MB (0 = none). */
const STOPS = [0, 1, 5, 10, 25, 50, 100, 250, 500, 1000, 2000]
const nearestStopIndex = (mb: number): number => {
  let best = 0
  for (let i = 1; i < STOPS.length; i++) {
    if (Math.abs(STOPS[i] - mb) < Math.abs(STOPS[best] - mb)) best = i
  }
  return best
}

/**
 * Files as a collapsible directory tree. Folder controls fan out to every
 * descendant file index (torrent-set takes an array of indices), so toggling
 * a folder's "wanted" or priority applies to its whole subtree in one call.
 *
 * A size slider drives a *local preview*: dragging it (or ticking rows while a
 * preview is active) only changes what the checkboxes show — nothing is sent
 * until "Apply", which commits the whole wanted/unwanted change in one call.
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
  // null = no preview (checkboxes reflect the server); a Set = files to skip in the preview.
  const [previewSkip, setPreviewSkip] = useState<Set<number> | null>(null)
  const [thresholdMB, setThresholdMB] = useState(0)

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

  // Slider is master: dragging re-derives the whole skip set by size.
  const applyThreshold = (mb: number): void => {
    setThresholdMB(mb)
    setPreviewSkip(new Set(unwantedBySizeThreshold(torrent.files, mb * MB)))
  }
  // Toggle rows within the preview (local only).
  const setPreviewMany = (indices: number[], wanted: boolean): void =>
    setPreviewSkip((prev) => {
      const next = new Set(prev ?? [])
      for (const i of indices) if (wanted) next.delete(i)
      else next.add(i)
      return next
    })
  const resetPreview = (): void => {
    setPreviewSkip(null)
    setThresholdMB(0)
  }
  // Commit the preview: only flip files whose wanted-state actually changes,
  // so priorities on already-correct files aren't disturbed.
  const applyPreview = (): void => {
    if (!previewSkip) return
    const unwant: number[] = []
    const want: number[] = []
    torrent.files.forEach((_, i) => {
      const shouldWant = !previewSkip.has(i)
      const isWanted = torrent.fileStats?.[i]?.wanted ?? true
      if (shouldWant && !isWanted) want.push(i)
      else if (!shouldWant && isWanted) unwant.push(i)
    })
    const fields: Record<string, number[]> = {}
    if (unwant.length) fields['files-unwanted'] = unwant
    if (want.length) fields['files-wanted'] = want
    if (Object.keys(fields).length) void setTorrent({ profileId, ids: [torrent.id], fields })
    resetPreview()
  }

  if (!torrent.files.length) {
    return <p className="p-4 text-center text-sm text-surface-500">No file metadata yet</p>
  }

  const previewing = previewSkip !== null
  const selectedCount = previewSkip ? torrent.files.length - previewSkip.size : 0

  const renderNode = (node: TreeNode, depth: number): React.JSX.Element => {
    const pad = { paddingLeft: `${depth * 16 + 12}px` }

    if (node.kind === 'dir') {
      const indices = collectIndices(node)
      let wanted: 'all' | 'some' | 'none'
      if (previewSkip) {
        const w = indices.filter((i) => !previewSkip.has(i)).length
        wanted = w === 0 ? 'none' : w === indices.length ? 'all' : 'some'
      } else {
        wanted = folderWanted(node)
      }
      const isCollapsed = collapsed.has(node.path)
      return (
        <div key={`d:${node.path}`}>
          <div className="flex items-center gap-2 py-1.5 pr-3" style={pad}>
            <Checkbox
              checked={wanted !== 'none'}
              onCheckedChange={(v) => (previewing ? setPreviewMany(indices, v) : setWanted(indices, v))}
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
    const wanted = previewSkip ? !previewSkip.has(node.index) : node.wanted
    return (
      <div key={`f:${node.index}`} className="group flex items-center gap-2 py-1.5 pr-3" style={pad}>
        <Checkbox
          checked={wanted}
          onCheckedChange={(v) =>
            previewing ? setPreviewMany([node.index], v) : setWanted([node.index], v)
          }
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

  return (
    <div>
      {/* Size-based bulk select: local preview, committed on Apply. */}
      <div className="flex items-center gap-2 border-b border-surface-200 px-3 py-2 dark:border-surface-700">
        <span className="shrink-0 text-xs text-surface-500">Skip files under</span>
        <input
          type="range"
          min={0}
          max={STOPS.length - 1}
          step={1}
          value={nearestStopIndex(thresholdMB)}
          onChange={(e) => applyThreshold(STOPS[Number(e.target.value)])}
          aria-label="Skip files under (size)"
          className="min-w-0 flex-1 accent-accent-500"
        />
        <Input
          type="number"
          min={0}
          value={thresholdMB}
          onChange={(e) => applyThreshold(Math.max(0, Number(e.target.value) || 0))}
          className="h-6 w-14 text-right text-xs"
        />
        <span className="shrink-0 text-xs text-surface-500">MB</span>
        {previewing && (
          <>
            <span className="shrink-0 text-xs text-surface-500">
              {selectedCount}/{torrent.files.length}
            </span>
            <Button size="sm" onClick={applyPreview}>
              Apply
            </Button>
            <Button size="sm" variant="ghost" onClick={resetPreview}>
              Reset
            </Button>
          </>
        )}
      </div>
      <div className="divide-y divide-surface-100 dark:divide-surface-800">
        {tree.map((n) => renderNode(n, 0))}
      </div>
    </div>
  )
}
