import type { TorrentDetail } from '@shared/transmission'
import { formatPercent, formatSpeed } from '@/lib/format'

export function PeersTab({ torrent }: { torrent: TorrentDetail }): React.JSX.Element {
  if (!torrent.peers.length) {
    return <p className="p-4 text-center text-sm text-neutral-500">No connected peers</p>
  }
  return (
    <table className="w-full text-xs">
      <thead className="sticky top-0 bg-neutral-50 text-left text-neutral-500 dark:bg-neutral-800">
        <tr>
          <th className="px-3 py-1.5 font-medium">Address</th>
          <th className="px-2 py-1.5 font-medium">Client</th>
          <th className="px-2 py-1.5 text-right font-medium">Have</th>
          <th className="px-2 py-1.5 text-right font-medium">Down</th>
          <th className="px-2 py-1.5 text-right font-medium">Up</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
        {torrent.peers.map((p) => (
          <tr key={`${p.address}:${p.port}`}>
            <td className="truncate px-3 py-1.5" title={p.flagStr}>
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
