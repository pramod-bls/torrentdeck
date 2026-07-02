import {
  ChevronDown,
  Link,
  FilePlus,
  Play,
  Pause,
  Trash2,
  ArrowDownUp,
  Server,
  Settings2,
  Plus,
  Pencil,
  SlidersHorizontal,
  PanelRight
} from 'lucide-react'
import type { SortKey } from '@shared/types'
import { useAppDispatch, useAppSelector, useActiveProfileId } from '@/app/hooks'
import { setActiveProfile } from '@/features/connection/connectionSlice'
import {
  openAddTorrent,
  openProfileEditor,
  openRemoveConfirm,
  setPrefsOpen,
  setSearch,
  setSessionSettingsOpen,
  setSort,
  toggleDetailCollapsed
} from '@/features/ui/uiSlice'
import { profileSortSaved } from '@/features/connection/connectionSlice'
import { useTorrentActionMutation } from '@/services/rpcApi'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown'

const SORT_LABELS: Record<SortKey, string> = {
  name: 'Name',
  totalSize: 'Size',
  percentDone: 'Progress',
  status: 'Status',
  rateDownload: 'Download speed',
  rateUpload: 'Upload speed',
  uploadRatio: 'Ratio',
  eta: 'ETA',
  addedDate: 'Date added',
  queuePosition: 'Queue position'
}

export function Toolbar(): React.JSX.Element {
  const dispatch = useAppDispatch()
  const profileId = useActiveProfileId()!
  const profiles = useAppSelector((s) => s.connection.profiles)
  const active = profiles.find((p) => p.id === profileId)
  const search = useAppSelector((s) => s.ui.search)
  const sort = useAppSelector((s) => s.ui.sort)
  const selectedIds = useAppSelector((s) => s.ui.selectedIds)
  const [torrentAction] = useTorrentActionMutation()

  const hasSelection = selectedIds.length > 0

  const pickSort = (key: SortKey): void => {
    const next = sort.key === key ? { key, desc: !sort.desc } : { key, desc: false }
    dispatch(setSort(next))
    dispatch(profileSortSaved({ id: profileId, sort: next }))
    void window.api.profiles.setSort(profileId, next)
  }

  const addFiles = async (): Promise<void> => {
    const files = await window.api.pickTorrentFiles()
    if (files.length) dispatch(openAddTorrent({ files }))
  }

  return (
    <div className="titlebar-drag flex items-center gap-2 border-b border-neutral-200 bg-neutral-50 py-2 pr-3 pl-20 dark:border-neutral-700 dark:bg-neutral-800/60">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm">
            <Plus size={14} /> Add <ChevronDown size={12} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onSelect={() => void addFiles()}>
            <FilePlus size={14} /> Torrent file…
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => dispatch(openAddTorrent({ magnet: '' }))}>
            <Link size={14} /> Magnet link…
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="mx-1 h-5 w-px bg-neutral-300 dark:bg-neutral-600" />

      <Button
        variant="ghost"
        size="icon"
        aria-label="Start selected"
        disabled={!hasSelection}
        onClick={() => void torrentAction({ profileId, action: 'torrent-start', ids: selectedIds })}
      >
        <Play size={15} />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Pause selected"
        disabled={!hasSelection}
        onClick={() => void torrentAction({ profileId, action: 'torrent-stop', ids: selectedIds })}
      >
        <Pause size={15} />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Remove selected"
        disabled={!hasSelection}
        onClick={() => dispatch(openRemoveConfirm(selectedIds))}
      >
        <Trash2 size={15} />
      </Button>

      <div className="flex-1" />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="secondary" size="sm">
            <ArrowDownUp size={13} />
            {SORT_LABELS[sort.key]} {sort.desc ? '↓' : '↑'}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Sort by</DropdownMenuLabel>
          {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
            <DropdownMenuItem key={key} onSelect={() => pickSort(key)}>
              <span className="w-3 text-xs">{sort.key === key ? (sort.desc ? '↓' : '↑') : ''}</span>
              {SORT_LABELS[key]}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Input
        value={search}
        onChange={(e) => dispatch(setSearch(e.target.value))}
        placeholder="Search torrents"
        className="w-52"
      />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="secondary" size="sm">
            <Server size={13} /> {active?.name ?? 'Server'} <ChevronDown size={12} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Servers</DropdownMenuLabel>
          {profiles.map((p) => (
            <DropdownMenuItem key={p.id} onSelect={() => void dispatch(setActiveProfile(p.id))}>
              <span className="w-3 text-xs">{p.id === profileId ? '•' : ''}</span>
              {p.name}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => dispatch(openProfileEditor(null))}>
            <Plus size={14} /> Add server…
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => dispatch(openProfileEditor(profileId))}>
            <Pencil size={14} /> Edit current server…
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Settings">
            <Settings2 size={15} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => dispatch(setSessionSettingsOpen(true))}>
            <SlidersHorizontal size={14} /> Server settings…
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => dispatch(setPrefsOpen(true))}>
            <Settings2 size={14} /> Preferences…
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Button
        variant="ghost"
        size="icon"
        aria-label="Toggle detail panel"
        onClick={() => dispatch(toggleDetailCollapsed())}
      >
        <PanelRight size={15} />
      </Button>
    </div>
  )
}
