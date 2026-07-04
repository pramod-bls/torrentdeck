import { cn } from '@/lib/cn'

/**
 * The TorrentDeck brand mark: a flat, wireframe "deck" of torrent panels
 * (download arrow, torrent rows, a seeding ring) on a muted-orange tile — the
 * same artwork as the app icon (build/icon.svg). Strokes are intentionally
 * heavier than the 1024px icon so the line-art stays legible at toolbar sizes.
 * Pass `withWordmark` to append the "Torrent" (white/ink) + "Deck" (orange) name.
 */
export function Logo({
  size = 22,
  withWordmark = false,
  className
}: {
  size?: number
  withWordmark?: boolean
  className?: string
}): React.JSX.Element {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <svg width={size} height={size} viewBox="0 0 1024 1024" role="img" aria-label="TorrentDeck" className="shrink-0">
        <rect x="0" y="0" width="1024" height="1024" rx="232" fill="#b06336" />
        <g fill="none" stroke="#ffffff" strokeLinecap="round" strokeLinejoin="round">
          <rect x="176" y="176" width="316" height="316" rx="48" strokeWidth="40" />
          <rect x="532" y="176" width="316" height="316" rx="48" strokeWidth="40" />
          <rect x="176" y="532" width="316" height="316" rx="48" strokeWidth="40" />
          <rect x="532" y="532" width="316" height="316" rx="48" strokeWidth="40" />
          <path d="M334 254 V400" strokeWidth="48" />
          <path d="M286 350 L334 402 L382 350" strokeWidth="48" />
          <path d="M584 262 H796" strokeWidth="42" />
          <path d="M584 344 H744" strokeWidth="42" />
          <path d="M228 618 H440" strokeWidth="42" />
          <path d="M228 700 H388" strokeWidth="42" />
          <circle cx="690" cy="690" r="78" strokeWidth="42" />
        </g>
      </svg>
      {withWordmark && (
        <span className="text-sm font-light tracking-wide text-surface-900 dark:text-white">
          Torrent<span className="font-normal text-accent-500 dark:text-accent-400">Deck</span>
        </span>
      )}
    </span>
  )
}
