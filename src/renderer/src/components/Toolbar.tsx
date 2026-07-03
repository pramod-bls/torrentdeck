import {
  ChevronDown,
  Link,
  FilePlus,
  Play,
  Pause,
  Trash2,
  Tag,
  Server,
  Settings2,
  Plus,
  Pencil,
  SlidersHorizontal,
  Keyboard,
  Gauge
} from 'lucide-react'
import { useAppDispatch, useAppSelector, useActiveProfileId } from '@/app/hooks'
import { setActiveProfile } from '@/features/connection/connectionSlice'
import { can, useServerCapabilities } from '@/features/connection/useCapabilities'
import {
  openAddTorrent,
  openLabelsEditor,
  openProfileEditor,
  openRemoveConfirm,
  setGroupsOpen,
  setPrefsOpen,
  setSessionSettingsOpen,
  setShortcutsOpen
} from '@/features/ui/uiSlice'
import { useTorrentActionMutation } from '@/services/rpcApi'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown'
import { AddPanelMenu } from '@/components/workspace/AddPanelMenu'

/**
 * Global chrome. The server switcher selects the DEFAULT server (add-torrent
 * target, session settings, stats, and the scope of 'default'-scoped panels);
 * individual Torrents panels may scope themselves to other servers. Bulk
 * action buttons operate on the current (server-qualified) selection.
 */
export function Toolbar(): React.JSX.Element {
  const dispatch = useAppDispatch()
  const defaultProfileId = useActiveProfileId()
  const caps = useServerCapabilities(defaultProfileId)
  const profiles = useAppSelector((s) => s.connection.profiles)
  const active = profiles.find((p) => p.id === defaultProfileId)
  const selection = useAppSelector((s) => s.ui.selection)
  const [torrentAction] = useTorrentActionMutation()

  const hasSelection = selection !== null && selection.ids.length > 0

  const act = (action: 'torrent-start' | 'torrent-stop') => () => {
    if (selection) void torrentAction({ profileId: selection.profileId, action, ids: selection.ids })
  }

  const addFiles = async (): Promise<void> => {
    const files = await window.api.pickTorrentFiles()
    if (files.length) dispatch(openAddTorrent({ files }))
  }

  return (
    <div className="titlebar-drag flex items-center gap-2 border-b border-surface-200 bg-surface-50 py-2 pr-3 pl-20 dark:border-surface-700 dark:bg-surface-800/60">
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

      <div className="mx-1 h-5 w-px bg-surface-300 dark:bg-surface-600" />

      <Button variant="ghost" size="icon" aria-label="Start selected" disabled={!hasSelection} onClick={act('torrent-start')}>
        <Play size={15} />
      </Button>
      <Button variant="ghost" size="icon" aria-label="Pause selected" disabled={!hasSelection} onClick={act('torrent-stop')}>
        <Pause size={15} />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Set labels for selected"
        disabled={!hasSelection}
        onClick={() => selection && dispatch(openLabelsEditor(selection))}
      >
        <Tag size={15} />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Remove selected"
        disabled={!hasSelection}
        onClick={() => selection && dispatch(openRemoveConfirm(selection))}
      >
        <Trash2 size={15} />
      </Button>

      <div className="flex-1" />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="secondary" size="sm">
            <Server size={13} /> {active?.name ?? 'Server'} <ChevronDown size={12} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Default server</DropdownMenuLabel>
          {profiles.map((p) => (
            <DropdownMenuItem key={p.id} onSelect={() => void dispatch(setActiveProfile(p.id))}>
              <span className="w-3 text-xs">{p.id === defaultProfileId ? '•' : ''}</span>
              {p.name}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => dispatch(openProfileEditor(null))}>
            <Plus size={14} /> Add server…
          </DropdownMenuItem>
          {defaultProfileId && (
            <DropdownMenuItem onSelect={() => dispatch(openProfileEditor(defaultProfileId))}>
              <Pencil size={14} /> Edit default server…
            </DropdownMenuItem>
          )}
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
          {can(caps, 'bandwidthGroups') && (
            <DropdownMenuItem onSelect={() => dispatch(setGroupsOpen(true))}>
              <Gauge size={14} /> Bandwidth groups…
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onSelect={() => dispatch(setPrefsOpen(true))}>
            <Settings2 size={14} /> Preferences…
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => dispatch(setShortcutsOpen(true))}>
            <Keyboard size={14} /> Keyboard shortcuts
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AddPanelMenu />
    </div>
  )
}
