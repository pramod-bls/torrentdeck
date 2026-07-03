/**
 * Builds a nested directory tree from Transmission's flat file list (paths use
 * '/' separators). Pure — no React — so the Files tab can render folders while
 * folder-level actions map back to the underlying file indices.
 */
import type { FileStat, TorrentFile } from '@shared/transmission'

export interface TreeFile {
  kind: 'file'
  name: string
  /** original index into torrent.files / fileStats — the id RPC uses */
  index: number
  length: number
  bytesCompleted: number
  wanted: boolean
  priority: -1 | 0 | 1
}

export interface TreeDir {
  kind: 'dir'
  name: string
  /** full path from the torrent root, stable id for expand/collapse state */
  path: string
  children: TreeNode[]
}

export type TreeNode = TreeDir | TreeFile

export function buildFileTree(files: TorrentFile[], stats: FileStat[]): TreeNode[] {
  const root: TreeDir = { kind: 'dir', name: '', path: '', children: [] }

  files.forEach((file, index) => {
    const parts = file.name.split('/')
    let dir = root
    for (let i = 0; i < parts.length - 1; i++) {
      const path = parts.slice(0, i + 1).join('/')
      let next = dir.children.find(
        (c): c is TreeDir => c.kind === 'dir' && c.path === path
      )
      if (!next) {
        next = { kind: 'dir', name: parts[i], path, children: [] }
        dir.children.push(next)
      }
      dir = next
    }
    const stat = stats[index]
    dir.children.push({
      kind: 'file',
      name: parts[parts.length - 1],
      index,
      length: file.length,
      bytesCompleted: file.bytesCompleted,
      wanted: stat?.wanted ?? true,
      priority: stat?.priority ?? 0
    })
  })

  return sortNodes(root.children)
}

function sortNodes(nodes: TreeNode[]): TreeNode[] {
  nodes.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === 'dir' ? -1 : 1
    return a.name.localeCompare(b.name, undefined, { numeric: true })
  })
  for (const n of nodes) if (n.kind === 'dir') sortNodes(n.children)
  return nodes
}

/** All file indices under a node (a single file → just its index). */
export function collectIndices(node: TreeNode): number[] {
  if (node.kind === 'file') return [node.index]
  return node.children.flatMap(collectIndices)
}

/** Tri-state wanted for a folder: 'all' | 'none' | 'some'. */
export function folderWanted(node: TreeDir): 'all' | 'none' | 'some' {
  let all = true
  let none = true
  const visit = (n: TreeNode): void => {
    if (n.kind === 'file') {
      if (n.wanted) none = false
      else all = false
    } else n.children.forEach(visit)
  }
  node.children.forEach(visit)
  return all ? 'all' : none ? 'none' : 'some'
}

/** Aggregate download progress (0..1) of everything under a folder, by bytes. */
export function folderProgress(node: TreeDir): number {
  let total = 0
  let done = 0
  const visit = (n: TreeNode): void => {
    if (n.kind === 'file') {
      total += n.length
      done += n.bytesCompleted
    } else n.children.forEach(visit)
  }
  node.children.forEach(visit)
  return total > 0 ? done / total : 1
}

export function folderSize(node: TreeDir): number {
  let total = 0
  const visit = (n: TreeNode): void => {
    if (n.kind === 'file') total += n.length
    else n.children.forEach(visit)
  }
  node.children.forEach(visit)
  return total
}
