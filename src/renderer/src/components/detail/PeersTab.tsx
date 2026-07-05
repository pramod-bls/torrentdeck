import type { TorrentDetail } from '@shared/transmission'
import { formatPercent, formatSpeed } from '@/lib/format'

/** ISO alpha-2 country code → flag emoji (regional indicator letters). */
function flagEmoji(cc?: string): string {
  if (!cc || cc.length !== 2 || !/^[a-z]{2}$/i.test(cc)) return ''
  return String.fromCodePoint(...[...cc.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65))
}

export function PeersTab({ torrent }: { torrent: TorrentDetail }): React.JSX.Element {
  if (!torrent.peers.length) {
    return <p className="p-4 text-center text-sm text-surface-500">No connected peers</p>
  }
  return (
    <table className="w-full text-xs">
      <thead className="sticky top-0 bg-surface-50 text-left text-surface-500 dark:bg-surface-800">
        <tr>
          <th className="px-3 py-1.5 font-medium">Address</th>
          <th className="px-2 py-1.5 font-medium">Client</th>
          <th className="px-2 py-1.5 text-right font-medium">Have</th>
          <th className="px-2 py-1.5 text-right font-medium">Down</th>
          <th className="px-2 py-1.5 text-right font-medium">Up</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-surface-100 dark:divide-surface-800">
        {torrent.peers.map((p) => (
          <tr key={`${p.address}:${p.port}`}>
            <td className="truncate px-3 py-1.5" title={p.country ? `${p.country} · ${p.flagStr}` : p.flagStr}>
              {p.country && <span className="mr-1.5">{flagEmoji(p.country)}</span>}
              {p.address}
            </td>
            <td className="max-w-28 truncate px-2 py-1.5" title={p.clientName}>
              {p.clientName}
            </td>
            <td className="px-2 py-1.5 text-right">{formatPercent(p.progress)}</td>
            <td className="px-2 py-1.5 text-right">
              {p.rateToClient > 0 ? formatSpeed(p.rateToClient) : '—'}
            </td>
            <td className="px-2 py-1.5 text-right">
              {p.rateToPeer > 0 ? formatSpeed(p.rateToPeer) : '—'}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
