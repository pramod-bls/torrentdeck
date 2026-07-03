import { useEffect, useMemo, useRef } from 'react'
import { bucketize, countHave, decodeBitfield } from '@/lib/pieces'

/**
 * Canvas piece map. 'strip' = one row, one bucket per CSS pixel (fits any
 * pieceCount). 'grid' = one ~10px cell per piece wrapped to the container
 * width; above GRID_PIECE_CAP it degrades to bucketed multi-row rendering so
 * pathological torrents never allocate absurd canvases.
 *
 * This shows what the DAEMON HAS verified — Transmission's RPC does not
 * expose per-piece swarm availability.
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
  mode
}: {
  pieces: string
  pieceCount: number
  mode: 'strip' | 'grid'
}): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)

  const bits = useMemo(() => decodeBitfield(pieces, pieceCount), [pieces, pieceCount])

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
        const buckets = bucketize(bits, Math.max(1, Math.floor(cssWidth)))
        const bw = canvas.width / buckets.length
        ctx.fillStyle = missColor
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.fillStyle = haveColor
        for (let i = 0; i < buckets.length; i++) {
          if (buckets[i] <= 0) continue
          ctx.globalAlpha = buckets[i]
          ctx.fillRect(i * bw, 0, Math.ceil(bw), canvas.height)
        }
        ctx.globalAlpha = 1
        return
      }

      // grid mode
      const perRow = Math.max(1, Math.floor((cssWidth + GAP) / (CELL + GAP)))
      const cellCount = Math.min(bits.length, GRID_PIECE_CAP)
      const bucketed = bits.length > GRID_PIECE_CAP ? bucketize(bits, GRID_PIECE_CAP) : null
      const rows = Math.max(1, Math.ceil(cellCount / perRow))
      const cssHeight = rows * (CELL + GAP) - GAP
      canvas.width = Math.floor(cssWidth * dpr)
      canvas.height = Math.floor(cssHeight * dpr)
      canvas.style.height = `${cssHeight}px`
      ctx.scale(dpr, dpr)
      for (let i = 0; i < cellCount; i++) {
        const frac = bucketed ? bucketed[i] : bits[i]
        const x = (i % perRow) * (CELL + GAP)
        const y = Math.floor(i / perRow) * (CELL + GAP)
        ctx.fillStyle = missColor
        ctx.fillRect(x, y, CELL, CELL)
        if (frac > 0) {
          ctx.globalAlpha = frac
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
  }, [bits, mode])

  const have = countHave(bits)

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
      </p>
    </div>
  )
}
