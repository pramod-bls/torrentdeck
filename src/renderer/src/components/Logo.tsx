import { cn } from '@/lib/cn'

/**
 * The TorrentDeck brand mark: a color-coded "deck" of torrent panels (download
 * arrow, torrent rows, a seeding ring) on the app's orange accent — the same
 * artwork as the app icon (build/icon.svg), simplified for crisp small sizes.
 * Pass `withWordmark` to append the "TorrentDeck" name.
 */
export function Logo({
  size = 20,
  withWordmark = false,
  className
}: {
  size?: number
  withWordmark?: boolean
  className?: string
}): React.JSX.Element {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 1024 1024"
        role="img"
        aria-label="TorrentDeck"
        className="shrink-0"
      >
        <defs>
          <linearGradient id="tdTile" x1="0" y1="0" x2="0" y2="1024" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#FB8B3D" />
            <stop offset="1" stopColor="#E24E0B" />
          </linearGradient>
        </defs>
        <rect x="0" y="0" width="1024" height="1024" rx="232" fill="url(#tdTile)" />
        {/* TL: download arrow */}
        <rect x="176" y="176" width="316" height="316" rx="54" fill="#A6E7C0" />
        <path d="M304 246 h60 v86 h56 L334 442 L248 332 h56 z" fill="#2FA96A" />
        {/* TR: torrent rows */}
        <rect x="532" y="176" width="316" height="316" rx="54" fill="#FBCF8C" />
        <rect x="572" y="248" width="236" height="30" rx="15" fill="#ffffff" fillOpacity="0.92" />
        <rect x="572" y="312" width="196" height="30" rx="15" fill="#ffffff" fillOpacity="0.78" />
        <rect x="572" y="376" width="216" height="30" rx="15" fill="#ffffff" fillOpacity="0.62" />
        {/* BL: torrent rows */}
        <rect x="176" y="532" width="316" height="316" rx="54" fill="#9CCDF6" />
        <rect x="216" y="604" width="236" height="30" rx="15" fill="#ffffff" fillOpacity="0.92" />
        <rect x="216" y="668" width="176" height="30" rx="15" fill="#ffffff" fillOpacity="0.78" />
        <rect x="216" y="732" width="216" height="30" rx="15" fill="#ffffff" fillOpacity="0.62" />
        {/* BR: seed ring */}
        <rect x="532" y="532" width="316" height="316" rx="54" fill="#C9B7F7" />
        <circle cx="690" cy="690" r="86" fill="none" stroke="#ffffff" strokeOpacity="0.5" strokeWidth="26" />
        <path
          d="M690 604 a86 86 0 0 1 74 130"
          fill="none"
          stroke="#B23C11"
          strokeWidth="26"
          strokeLinecap="round"
        />
      </svg>
      {withWordmark && (
        <span className="text-sm font-semibold tracking-tight text-surface-800 dark:text-surface-100">
          Torrent<span className="text-accent-600 dark:text-accent-400">Deck</span>
        </span>
      )}
    </span>
  )
}
