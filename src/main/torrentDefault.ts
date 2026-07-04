/**
 * First-run offer to make TorrentDeck the default app for `.torrent` files
 * (macOS). Electron has no API for file-type defaults, so we shell out to a
 * bundled Swift helper (build/mac/set-default-torrent.swift → Resources, see
 * build/afterPack.cjs) that wraps `LSSetDefaultRoleHandlerForContentType` for
 * the `org.bittorrent.torrent` UTI. `magnet:` links are already auto-claimed
 * via `app.setAsDefaultProtocolClient` in index.ts.
 *
 * We ask once (tracked by the `askedTorrentDefault` pref) and only if we aren't
 * already the default — never nagging, never silently overriding.
 */
import { app, dialog, BrowserWindow } from 'electron'
import { join } from 'node:path'
import { existsSync } from 'node:fs'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { log } from './logger'
import { getPrefs, setPrefs } from './profiles'

const execFileAsync = promisify(execFile)
const TORRENT_BUNDLE_ID = 'com.torrentdeck.app'

export async function maybePromptTorrentDefault(win: BrowserWindow | null): Promise<void> {
  if (process.platform !== 'darwin' || !app.isPackaged) return
  if (getPrefs().askedTorrentDefault) return

  const helper = join(process.resourcesPath, 'set-default-torrent')
  if (!existsSync(helper)) {
    log.warn('torrent-default: helper not bundled; skipping')
    return
  }

  try {
    const { stdout } = await execFileAsync(helper, ['check'])
    const current = stdout.trim()
    log.info(`torrent-default: current .torrent handler = ${current || '(none)'}`)
    if (current === TORRENT_BUNDLE_ID) {
      setPrefs({ askedTorrentDefault: true })
      return
    }

    const opts: Electron.MessageBoxOptions = {
      type: 'question',
      title: 'Default torrent app',
      message: 'Make TorrentDeck your default app for torrent files?',
      detail:
        'TorrentDeck will open when you double-click a .torrent file. ' +
        'You can change this any time in Finder (Get Info → Open with).',
      buttons: ['Make Default', 'Not Now'],
      defaultId: 0,
      cancelId: 1
    }
    const { response } = win ? await dialog.showMessageBox(win, opts) : await dialog.showMessageBox(opts)
    setPrefs({ askedTorrentDefault: true })

    if (response === 0) {
      const { stdout: after } = await execFileAsync(helper, ['set', TORRENT_BUNDLE_ID])
      log.info(`torrent-default: set default → ${after.trim()}`)
    }
  } catch (err) {
    log.warn('torrent-default: check/set failed', err)
  }
}
