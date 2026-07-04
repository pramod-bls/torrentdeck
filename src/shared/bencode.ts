/**
 * Minimal bencode decoder — just enough to read a torrent's file list without
 * a full parser. Used by the renderer to preview a `.torrent` before adding
 * (`parseTorrentPreview`) and by the main process to read a magnet's metadata
 * fetched via Deluge's prefetch (`parseInfoDictFiles`). Pure: no Node/Electron
 * imports (only the universal atob/TextDecoder/Uint8Array globals).
 */

export interface TorrentPreviewFile {
  path: string
  length: number
}

export interface TorrentPreview {
  name: string
  files: TorrentPreviewFile[]
  totalLength: number
}

type BValue = number | Uint8Array | BValue[] | BDict
interface BDict {
  [key: string]: BValue
}

class Decoder {
  private pos = 0
  constructor(private readonly buf: Uint8Array) {}

  decode(): BValue {
    const c = this.buf[this.pos]
    if (c === 0x69) return this.decodeInt() // i
    if (c === 0x6c) return this.decodeList() // l
    if (c === 0x64) return this.decodeDict() // d
    return this.decodeBytes()
  }

  private decodeInt(): number {
    const end = this.buf.indexOf(0x65, this.pos) // e
    if (end < 0) throw new Error('bad int')
    const s = new TextDecoder().decode(this.buf.subarray(this.pos + 1, end))
    this.pos = end + 1
    return Number(s)
  }

  private decodeBytes(): Uint8Array {
    const colon = this.buf.indexOf(0x3a, this.pos)
    if (colon < 0) throw new Error('bad string')
    const len = Number(new TextDecoder().decode(this.buf.subarray(this.pos, colon)))
    if (!Number.isFinite(len) || len < 0) throw new Error('bad string length')
    const start = colon + 1
    this.pos = start + len
    return this.buf.subarray(start, this.pos)
  }

  private decodeList(): BValue[] {
    this.pos++
    const out: BValue[] = []
    while (this.buf[this.pos] !== 0x65) out.push(this.decode())
    this.pos++
    return out
  }

  private decodeDict(): BDict {
    this.pos++
    const out: BDict = {}
    while (this.buf[this.pos] !== 0x65) {
      const key = new TextDecoder().decode(this.decodeBytes())
      out[key] = this.decode()
    }
    this.pos++
    return out
  }
}

function text(v: BValue | undefined): string {
  return v instanceof Uint8Array ? new TextDecoder().decode(v) : ''
}

const base64ToBytes = (base64: string): Uint8Array =>
  Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))

/** Build the preview from a torrent's `info` dict (multi- or single-file). */
function previewFromInfo(info: BDict): TorrentPreview {
  const name = text(info['name']) || 'torrent'
  const files: TorrentPreviewFile[] = []
  if (Array.isArray(info['files'])) {
    for (const f of info['files'] as BDict[]) {
      const parts = (f['path'] as BValue[]).map((p) => text(p))
      files.push({ path: parts.join('/'), length: Number(f['length'] ?? 0) })
    }
  } else {
    files.push({ path: name, length: Number(info['length'] ?? 0) })
  }
  return { name, files, totalLength: files.reduce((s, f) => s + f.length, 0) }
}

/** Parse a whole `.torrent` file (base64) → its `info` preview, or null. */
export function parseTorrentPreview(base64: string): TorrentPreview | null {
  try {
    const root = new Decoder(base64ToBytes(base64)).decode() as BDict
    const info = root['info'] as BDict | undefined
    return info ? previewFromInfo(info) : null
  } catch {
    return null
  }
}

/**
 * Parse a bencoded `info` dict directly (base64) → its preview, or null.
 * Deluge's `core.prefetch_magnet_metadata` returns the bencoded info dict, not
 * a full torrent, so this is the entry point for the magnet prefetch path.
 */
export function parseInfoDictFiles(base64: string): TorrentPreview | null {
  try {
    const info = new Decoder(base64ToBytes(base64)).decode() as BDict
    // Some Deluge builds wrap it as a full torrent; accept either shape.
    const dict = (info['info'] as BDict | undefined) ?? info
    if (!dict || (dict['files'] === undefined && dict['length'] === undefined && dict['name'] === undefined))
      return null
    return previewFromInfo(dict)
  } catch {
    return null
  }
}
