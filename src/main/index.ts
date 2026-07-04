/**
 * Main-process entry: window lifecycle, single-instance lock, auto-update,
 * and OS handoff of magnet: links / .torrent files.
 *
 * Open events can arrive before the renderer exists (app launched BY a magnet
 * click) or while it's already running (second-instance argv, macOS open-url).
 * Both funnel into pending queues that are flushed once the renderer calls
 * `app:rendererReady` — nothing is delivered into a window that can't yet
 * listen.
 */
import { app, BrowserWindow, ipcMain, shell } from 'electron'
import { join } from 'node:path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { readFile } from 'node:fs/promises'
import { basename } from 'node:path'
import { registerIpc } from './ipc'
import { createTray, destroyTray, updateTraySpeeds } from './tray'
import { getPrefs } from './profiles'
import { initLogging, log } from './logger'
import { initAutoUpdater, checkForUpdatesManually } from './updater'
import { maybePromptTorrentDefault } from './torrentDefault'
import { startClipboardWatch } from './clipboardWatch'
import { isQuitting, setQuitting } from './appState'
import type { TorrentFilePayload } from '@shared/types'

let mainWindow: BrowserWindow | null = null
let rendererReady = false
const pendingMagnets: string[] = []
const pendingTorrentPaths: string[] = []

function extractOpenArgs(argv: string[]): void {
  for (const arg of argv) {
    if (arg.startsWith('magnet:')) pendingMagnets.push(arg)
    else if (arg.toLowerCase().endsWith('.torrent')) pendingTorrentPaths.push(arg)
  }
}

async function flushPendingOpens(): Promise<void> {
  if (!rendererReady || !mainWindow) return
  while (pendingMagnets.length) {
    mainWindow.webContents.send('open-magnet', pendingMagnets.shift())
  }
  if (pendingTorrentPaths.length) {
    const paths = pendingTorrentPaths.splice(0)
    const files: TorrentFilePayload[] = []
    for (const p of paths) {
      try {
        files.push({ name: basename(p), base64: (await readFile(p)).toString('base64') })
      } catch {
        // ignore unreadable paths handed to us by the OS
      }
    }
    if (files.length) mainWindow.webContents.send('open-torrent-files', files)
  }
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 780,
    minWidth: 800,
    minHeight: 500,
    show: false,
    autoHideMenuBar: true,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    webPreferences: {
      preload: join(import.meta.dirname, '../preload/index.cjs'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => mainWindow?.show())
  // Close-to-tray: intercept the close and hide instead of quitting, unless
  // the user is actually quitting the app (Cmd-Q / menu / tray Quit).
  mainWindow.on('close', (e) => {
    if (!isQuitting() && getPrefs().closeToTray) {
      e.preventDefault()
      mainWindow?.hide()
    }
  })
  mainWindow.on('closed', () => {
    mainWindow = null
    rendererReady = false
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(import.meta.dirname, '../renderer/index.html'))
  }
}

const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  app.quit()
} else {
  extractOpenArgs(process.argv.slice(1))

  app.on('second-instance', (_e, argv) => {
    extractOpenArgs(argv.slice(1))
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
    void flushPendingOpens()
  })

  app.on('open-url', (event, url) => {
    event.preventDefault()
    if (url.startsWith('magnet:')) pendingMagnets.push(url)
    void flushPendingOpens()
  })

  app.on('open-file', (event, path) => {
    event.preventDefault()
    pendingTorrentPaths.push(path)
    void flushPendingOpens()
  })

  app.whenReady().then(() => {
    initLogging()
    electronApp.setAppUserModelId('com.torrentdeck.app')
    if (!app.isPackaged) {
      // Packaged builds get the icon from the installer; dev runs show
      // Electron's default unless we set it explicitly.
      if (process.platform === 'darwin') {
        app.dock?.setIcon(join(app.getAppPath(), 'build/icon.png'))
      }
    }
    if (app.isPackaged) {
      app.setAsDefaultProtocolClient('magnet')
      initAutoUpdater()
    }

    app.on('browser-window-created', (_e, window) => {
      optimizer.watchWindowShortcuts(window)
    })

    registerIpc()
    ipcMain.handle('app:rendererReady', () => {
      rendererReady = true
      void flushPendingOpens()
    })
    ipcMain.handle('app:focusWindow', () => {
      if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore()
        mainWindow.show()
        mainWindow.focus()
      }
    })
    ipcMain.on('tray:setSpeeds', (_e, down: number, up: number) => updateTraySpeeds(down, up))
    ipcMain.handle('updates:check', () => checkForUpdatesManually())

    createWindow()
    if (mainWindow) createTray(mainWindow)
    startClipboardWatch(() => mainWindow)

    // First-run offer to become the default .torrent handler (macOS, packaged).
    if (mainWindow) {
      mainWindow.webContents.once('did-finish-load', () => {
        setTimeout(() => void maybePromptTorrentDefault(mainWindow), 1200)
      })
    }

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
      else mainWindow?.show()
    })
  })

  app.on('before-quit', () => {
    setQuitting(true)
    log.info('shutting down')
    destroyTray()
  })

  app.on('window-all-closed', () => {
    // With a tray + close-to-tray the app intentionally outlives its window.
    if (process.platform !== 'darwin' && !getPrefs().closeToTray) app.quit()
  })
}
