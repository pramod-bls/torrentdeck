import { useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { bootstrap } from '@/features/connection/connectionSlice'
import { openAddTorrent } from '@/features/ui/uiSlice'
import { loadWorkspace } from '@/features/workspace/workspaceSlice'
import { useShortcuts } from '@/app/useShortcuts'
import { Toolbar } from '@/components/Toolbar'
import { Workspace } from '@/components/workspace/Workspace'
import { StatusBar } from '@/components/StatusBar'
import { WelcomeScreen } from '@/components/WelcomeScreen'
import { AddTorrentDialog } from '@/components/dialogs/AddTorrentDialog'
import { ProfileDialog } from '@/components/dialogs/ProfileDialog'
import { RemoveConfirmDialog } from '@/components/dialogs/RemoveConfirmDialog'
import { SessionSettingsDialog } from '@/components/dialogs/SessionSettingsDialog'
import { PrefsDialog } from '@/components/dialogs/PrefsDialog'
import { LabelsDialog } from '@/components/dialogs/LabelsDialog'
import { ShortcutsDialog } from '@/components/dialogs/ShortcutsDialog'

/** Applies the theme pref by toggling `.dark` on <html>; tracks the OS scheme when set to "system". */
function useTheme(): void {
  const theme = useAppSelector((s) => s.connection.prefs.theme)
  useEffect(() => {
    const root = document.documentElement
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = (): void => {
      const dark = theme === 'dark' || (theme === 'system' && media.matches)
      root.classList.toggle('dark', dark)
    }
    apply()
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [theme])
}

/**
 * Subscribes to magnet/.torrent open events pushed from the main process and
 * signals readiness — the main process queues any events that arrived before
 * this ran (e.g. the app was launched by clicking a magnet link).
 */
function useOsOpenHandlers(): void {
  const dispatch = useAppDispatch()
  useEffect(() => {
    const offMagnet = window.api.onOpenMagnet((url) => dispatch(openAddTorrent({ magnet: url })))
    const offFiles = window.api.onOpenTorrentFiles((files) => dispatch(openAddTorrent({ files })))
    window.api.rendererReady()
    return () => {
      offMagnet()
      offFiles()
    }
  }, [dispatch])
}

function useTorrentFileDrop(): void {
  const dispatch = useAppDispatch()
  useEffect(() => {
    const onDragOver = (e: DragEvent): void => e.preventDefault()
    const onDrop = async (e: DragEvent): Promise<void> => {
      e.preventDefault()
      const files = [...(e.dataTransfer?.files ?? [])]
      const paths = files.map((f) => window.api.getPathForFile(f)).filter(Boolean)
      if (!paths.length) return
      const payloads = await window.api.readDroppedTorrents(paths)
      if (payloads.length) dispatch(openAddTorrent({ files: payloads }))
    }
    document.addEventListener('dragover', onDragOver)
    document.addEventListener('drop', onDrop)
    return () => {
      document.removeEventListener('dragover', onDragOver)
      document.removeEventListener('drop', onDrop)
    }
  }, [dispatch])
}

export default function App(): React.JSX.Element {
  const dispatch = useAppDispatch()
  const { loaded, profiles, activeProfileId } = useAppSelector((s) => s.connection)

  useTheme()
  useOsOpenHandlers()
  useTorrentFileDrop()
  useShortcuts()

  useEffect(() => {
    void dispatch(bootstrap())
  }, [dispatch])

  useEffect(() => {
    if (activeProfileId) void dispatch(loadWorkspace(activeProfileId))
  }, [dispatch, activeProfileId])

  if (!loaded) return <div className="flex h-full items-center justify-center" />

  const showMain = profiles.length > 0 && activeProfileId

  return (
    <div className="flex h-full flex-col">
      {showMain ? (
        <>
          <Toolbar />
          <Workspace />
          <StatusBar />
        </>
      ) : (
        <WelcomeScreen />
      )}
      <AddTorrentDialog />
      <ProfileDialog />
      <RemoveConfirmDialog />
      <SessionSettingsDialog />
      <PrefsDialog />
      <LabelsDialog />
      <ShortcutsDialog />
    </div>
  )
}
