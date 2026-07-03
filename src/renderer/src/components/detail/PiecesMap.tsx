import { useEffect, useMemo, useRef } from 'react'
import {
  availabilitySummary,
  bucketize,
  bucketizeAvailability,
  countHave,
  decodeBitfield
} from '@/lib/pieces'

/**
 * Canvas piece map. 'strip' = one row, one bucket per CSS pixel (fits any
 * pieceCount). 'grid' = one ~10px cell per piece wrapped to the container
 * width; above GRID_PIECE_CAP it degrades to bucketed multi-row rendering so
 * pathological torrents never allocate absurd canvases.
 *
 * Colors: accent = piece held locally; warning tint = missing piece that at
 * least one connected peer can supply (Transmission 4.0+ `availability`);
 * bare surface = missing and currently unavailable in the swarm.
 */
const GRID_PIECE_CAP = 20_000
const CELL = 10
const GAP = 1

function cssVar(el: HTMLElement, name: string, fallback: string): string {
  return getComputedStyle(el).getPropertyValue(name).trim() || fallback
}

export function PiecesMap({
  pieces,
  pieceCount,
  availability,
  mode
}: {
  pieces: string
  pieceCount: number
  /** per-piece peer counts (-1 = have); optional — absent on pre-4.0 daemons */
  availability?: number[]
  mode: 'strip' | 'grid'
}): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)

  const bits = useMemo(() => decodeBitfield(pieces, pieceCount), [pieces, pieceCount])
  const avail = availability && availability.length === pieceCount ? availability : undefined

  useEffect(() => {
    const canvas = canvasRef.current
    const wrap = wrapRef.current
    if (!canvas || !wrap) return

    const draw = (): void => {
      const dpr = window.devicePixelRatio || 1
      const cssWidth = wrap.clientWidth
      if (cssWidth <= 0) return
      const dark = document.documentElement.classList.contains('dark')
      const haveColor = cssVar(canvas, '--color-accent-500', '#6478cb')
      const availColor = cssVar(canvas, '--color-warning-400', '#cf983f')
      const missColor = dark
        ? cssVar(canvas, '--color-surface-800', '#2a2b2e')
        : cssVar(canvas, '--color-surface-200', '#e6e6e2')

      const ctx = canvas.getContext('2d')
      if (!ctx) return

      if (mode === 'strip') {
        const cssHeight = 24
        canvas.width = Math.floor(cssWidth * dpr)
        canvas.height = Math.floor(cssHeight * dpr)
        canvas.style.height = `${cssHeight}px`
        const bucketCount = Math.max(1, Math.floor(cssWidth))
        const haveBuckets = bucketize(bits, bucketCount)
        const availBuckets = avail ? bucketizeAvailability(avail, bucketCount) : null
        const bw = canvas.width / bucketCount
        ctx.fillStyle = missColor
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        if (availBuckets) {
          ctx.fillStyle = availColor
          for (let i = 0; i < bucketCount; i++) {
            if (availBuckets[i] <= 0) continue
            ctx.globalAlpha = availBuckets[i] * 0.6
            ctx.fillRect(i * bw, 0, Math.ceil(bw), canvas.height)
          }
        }
        ctx.fillStyle = haveColor
        for (let i = 0; i < bucketCount; i++) {
          if (haveBuckets[i] <= 0) continue
          ctx.globalAlpha = haveBuckets[i]
          ctx.fillRect(i * bw, 0, Math.ceil(bw), canvas.height)
        }
        ctx.globalAlpha = 1
        return
      }

      // grid mode
      const perRow = Math.max(1, Math.floor((cssWidth + GAP) / (CELL + GAP)))
      const cellCount = Math.min(bits.length, GRID_PIECE_CAP)
      const bucketedHave = bits.length > GRID_PIECE_CAP ? bucketize(bits, GRID_PIECE_CAP) : null
      const bucketedAvail =
        avail && bits.length > GRID_PIECE_CAP ? bucketizeAvailability(avail, GRID_PIECE_CAP) : null
      const rows = Math.max(1, Math.ceil(cellCount / perRow))
      const cssHeight = rows * (CELL + GAP) - GAP
      canvas.width = Math.floor(cssWidth * dpr)
      canvas.height = Math.floor(cssHeight * dpr)
      canvas.style.height = `${cssHeight}px`
      ctx.scale(dpr, dpr)
      for (let i = 0; i < cellCount; i++) {
        const haveFrac = bucketedHave ? bucketedHave[i] : bits[i]
        const availFrac = bucketedAvail
          ? bucketedAvail[i]
          : avail && avail[i] >= 0
            ? avail[i] > 0
              ? 1
              : 0
            : 0
        const x = (i % perRow) * (CELL + GAP)
        const y = Math.floor(i / perRow) * (CELL + GAP)
        ctx.fillStyle = missColor
        ctx.fillRect(x, y, CELL, CELL)
        if (availFrac > 0 && haveFrac < 1) {
          ctx.globalAlpha = availFrac * 0.6
          ctx.fillStyle = availColor
          ctx.fillRect(x, y, CELL, CELL)
          ctx.globalAlpha = 1
        }
        if (haveFrac > 0) {
          ctx.globalAlpha = haveFrac
          ctx.fillStyle = haveColor
          ctx.fillRect(x, y, CELL, CELL)
          ctx.globalAlpha = 1
        }
      }
    }

    draw()
    const ro = new ResizeObserver(draw)
    ro.observe(wrap)
    return () => ro.disconnect()
  }, [bits, avail, mode])

  const have = countHave(bits)
  const summary = avail ? availabilitySummary(avail) : null
  const availPct =
    summary && summary.missing > 0
      ? Math.round((summary.missingAvailable / summary.missing) * 100)
      : null

  if (pieceCount <= 0) {
    return (
      <p className="py-2 text-center text-xs text-surface-500">
        No piece data yet (waiting for metadata)
      </p>
    )
  }

  return (
    <div ref={wrapRef} className="w-full">
      <canvas ref={canvasRef} className="w-full rounded" />
      <p className="mt-1 text-[11px] text-surface-500 dark:text-surface-400">
        {have.toLocaleString()} of {pieceCount.toLocaleString()} pieces · downloaded map
        {availPct !== null && ` · ${availPct}% of missing pieces available now`}
      </p>
      {mode === 'grid' && (
        <p className="mt-1 flex items-center gap-3 text-[11px] text-surface-500 dark:text-surface-400">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-sm bg-accent-500" /> have
          </span>
          {avail && (
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-sm bg-warning-400/60" /> available
            </span>
          )}
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-sm bg-surface-200 dark:bg-surface-800" /> missing
          </span>
        </p>
      )}
    </div>
  )
}
