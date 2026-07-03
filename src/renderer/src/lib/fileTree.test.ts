import { describe, expect, it } from 'vitest'
import type { FileStat, TorrentFile } from '@shared/transmission'
import { buildFileTree, collectIndices, folderWanted, type TreeDir } from './fileTree'

const files = (names: string[]): TorrentFile[] =>
  names.map((name) => ({ name, length: 100, bytesCompleted: 50 }))
const stats = (wanted: boolean[]): FileStat[] =>
  wanted.map((w) => ({ wanted: w, priority: 0, bytesCompleted: 50 }))

describe('buildFileTree', () => {
  it('nests folders and keeps original indices', () => {
    const tree = buildFileTree(
      files(['dir/a.txt', 'dir/sub/b.txt', 'top.txt']),
      stats([true, true, true])
    )
    // dirs sort before files
    expect(tree.map((n) => n.name)).toEqual(['dir', 'top.txt'])
    const dir = tree[0] as TreeDir
    expect(dir.children.map((n) => n.name)).toEqual(['sub', 'a.txt'])
    const sub = dir.children[0] as TreeDir
    expect(sub.children[0]).toMatchObject({ kind: 'file', name: 'b.txt', index: 1 })
  })

  it('collects all descendant indices for a folder', () => {
    const tree = buildFileTree(files(['d/a', 'd/e/b', 'd/e/c']), stats([true, true, true]))
    expect(collectIndices(tree[0]).sort()).toEqual([0, 1, 2])
  })

  it('reports folder wanted tri-state', () => {
    const allOn = buildFileTree(files(['d/a', 'd/b']), stats([true, true]))
    expect(folderWanted(allOn[0] as TreeDir)).toBe('all')
    const allOff = buildFileTree(files(['d/a', 'd/b']), stats([false, false]))
    expect(folderWanted(allOff[0] as TreeDir)).toBe('none')
    const mixed = buildFileTree(files(['d/a', 'd/b']), stats([true, false]))
    expect(folderWanted(mixed[0] as TreeDir)).toBe('some')
  })

  it('handles a single-file torrent (no folders)', () => {
    const tree = buildFileTree(files(['movie.mkv']), stats([true]))
    expect(tree).toHaveLength(1)
    expect(tree[0]).toMatchObject({ kind: 'file', index: 0 })
  })
})
