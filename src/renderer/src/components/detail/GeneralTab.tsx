import { useEffect, useState } from 'react'
import type { TorrentDetail } from '@shared/transmission'
import { useSetTorrentMutation, useSetLocationMutation } from '@/services/rpcApi'
import { statusText } from '@/features/torrents/derive'
import { formatBytes, formatDate, formatEta, formatPercent, formatRatio } from '@/lib/format'
import { Input, Field } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

function Row({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <div className="flex justify-between gap-3 py-1 text-xs">
      <span className="shrink-0 text-neutral-500 dark:text-neutral-400">{label}</span>
      <span className="truncate text-right" title={value}>
        {value}
      </span>
    </div>
  )
}

export function GeneralTab({
  torrent,
  profileId
}: {
  torrent: TorrentDetail
  profileId: string
}): React.JSX.Element {
  const [setTorrent] = useSetTorrentMutation()
  const [setLocation] = useSetLocationMutation()
  const [labelsDraft, setLabelsDraft] = useState(torrent.labels.join(', '))
  const [locationDraft, setLocationDraft] = useState(torrent.downloadDir)

  useEffect(() => setLabelsDraft(torrent.labels.join(', ')), [torrent.id, torrent.labels])
  useEffect(() => setLocationDraft(torrent.downloadDir), [torrent.id, torrent.downloadDir])

  const saveLabels = (): void => {
    const labels = labelsDraft
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    void setTorrent({ profileId, ids: [torrent.id], fields: { labels } })
  }

  const moveData = (): void => {
    if (locationDraft && locationDraft !== torrent.downloadDir) {
      void setLocation({ profileId, ids: [torrent.id], location: locationDraft, move: true })
    }
  }

  return (
    <div className="space-y-4 p-3">
      <div>
        <p className="text-sm font-medium break-all">{torrent.name}</p>
        {torrent.error !== 0 && (
          <p className="mt-1 text-xs text-red-600 dark:text-red-400">{torrent.errorString}</p>
        )}
      </div>

      <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
        <Row label="Status" value={statusText(torrent)} />
        <Row label="Progress" value={formatPercent(torrent.percentDone)} />
        <Row label="Size" value={formatBytes(torrent.totalSize)} />
        <Row label="Downloaded" value={formatBytes(torrent.downloadedEver)} />
        <Row label="Uploaded" value={formatBytes(torrent.uploadedEver)} />
        <Row label="Ratio" value={formatRatio(torrent.uploadRatio)} />
        <Row label="ETA" value={formatEta(torrent.eta)} />
        <Row
          label="Peers"
          value={`${torrent.peersConnected} connected (${torrent.peersSendingToUs} down, ${torrent.peersGettingFromUs} up)`}
        />
        <Row label="Pieces" value={`${torrent.pieceCount} × ${formatBytes(torrent.pieceSize)}`} />
        <Row label="Privacy" value={torrent.isPrivate ? 'Private torrent' : 'Public torrent'} />
        <Row label="Added" value={formatDate(torrent.addedDate)} />
        <Row label="Completed" value={formatDate(torrent.doneDate)} />
        <Row label="Last active" value={formatDate(torrent.activityDate)} />
        <Row label="Creator" value={torrent.creator || '—'} />
        <Row label="Comment" value={torrent.comment || '—'} />
        <Row label="Hash" value={torrent.hashString} />
      </div>

      <Field label="Location">
        <div className="flex gap-1.5">
          <Input value={locationDraft} onChange={(e) => setLocationDraft(e.target.value)} />
          <Button
            variant="secondary"
            size="sm"
            disabled={locationDraft === torrent.downloadDir}
            onClick={moveData}
          >
            Move
          </Button>
        </div>
      </Field>

      <Field label="Labels (comma separated)">
        <div className="flex gap-1.5">
          <Input
            value={labelsDraft}
            onChange={(e) => setLabelsDraft(e.target.value)}
            placeholder="isos, linux"
          />
          <Button
            variant="secondary"
            size="sm"
            disabled={labelsDraft === torrent.labels.join(', ')}
            onClick={saveLabels}
          >
            Save
          </Button>
        </div>
      </Field>
    </div>
  )
}
