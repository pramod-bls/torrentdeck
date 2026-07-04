/**
 * System tray / menu-bar presence. The tray lives in the main process but the
 * speed figures come from the renderer (which owns the RPC polling) via the
 * `tray:setSpeeds` channel. Pause-all / resume-all act directly through the
 * main-process RPC client for the default server — no renderer round-trip.
 */
import { app, Menu, Tray, nativeImage, type BrowserWindow } from 'electron'
import { join } from 'node:path'
import { createAdapter } from './rpc/adapters'
import * as profiles from './profiles'

let tray: Tray | null = null

function formatSpeed(bytesPerSec: number): string {
  if (bytesPerSec <= 0) return '0 B/s'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.min(Math.floor(Math.log(bytesPerSec) / Math.log(1000)), units.length - 1)
  const v = bytesPerSec / 1000 ** i
  return `${v >= 100 || i === 0 ? Math.round(v) : v.toFixed(1)} ${units[i]}/s`
}

async function setAllPaused(paused: boolean): Promise<void> {
  // Act on every configured server (there's no single "active" server anymore).
  const action = paused ? 'torrent-stop' : 'torrent-start'
  await Promise.all(
    profiles.listProfiles().map(async (p) => {
      try {
        const client = createAdapter(p, profiles.getPassword(p.id))
        // Empty ids = "all torrents" per the TorrentClient contract.
        await client.torrentAction(action, [])
      } catch {
        // skip unreachable / not-yet-supported servers
      }
    })
  )
}

function rebuildMenu(window: BrowserWindow): void {
  if (!tray) return
  const menu = Menu.buildFromTemplate([
    {
      label: window.isVisible() ? 'Hide window' : 'Show window',
      click: () => (window.isVisible() ? window.hide() : (window.show(), window.focus()))
    },
    { type: 'separator' },
    { label: 'Pause all', click: () => void setAllPaused(true) },
    { label: 'Resume all', click: () => void setAllPaused(false) },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.quit()
      }
    }
  ])
  tray.setContextMenu(menu)
}

export function createTray(window: BrowserWindow): void {
  if (tray) return
  const icon = nativeImage
    .createFromPath(join(app.getAppPath(), 'build/icon.png'))
    .resize({ width: 18, height: 18 })
  icon.setTemplateImage(process.platform === 'darwin')
  tray = new Tray(icon)
  tray.setToolTip('TorrentDeck')
  tray.on('click', () => {
    if (window.isVisible()) window.focus()
    else {
      window.show()
      window.focus()
    }
    rebuildMenu(window)
  })
  window.on('show', () => rebuildMenu(window))
  window.on('hide', () => rebuildMenu(window))
  rebuildMenu(window)
}

export function updateTraySpeeds(down: number, up: number): void {
  if (!tray) return
  tray.setToolTip(`TorrentDeck\n↓ ${formatSpeed(down)}  ↑ ${formatSpeed(up)}`)
}

export function destroyTray(): void {
  tray?.destroy()
  tray = null
}
