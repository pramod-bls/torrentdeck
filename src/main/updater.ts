/**
 * Auto-update via electron-updater, reading published GitHub releases (see the
 * `publish` block in electron-builder.yml → pramod-bls/torrentdeck). Each
 * release's `latest*.yml` + installer/blockmap is produced by
 * `electron-builder --publish always`.
 *
 * `checkForUpdatesAndNotify()` downloads a newer version in the background and
 * shows a native notification; the update is applied on next quit. All stages
 * are logged so an update that silently doesn't happen can be diagnosed from
 * the log file. macOS requires the app to be signed + notarized for updates to
 * install, which our release builds are.
 */
import electronUpdater from 'electron-updater'
import { log } from './logger'

const { autoUpdater } = electronUpdater

export function initAutoUpdater(): void {
  autoUpdater.logger = log
  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('checking-for-update', () => log.info('updater: checking for update'))
  autoUpdater.on('update-available', (info) =>
    log.info(`updater: update available → ${info.version}`)
  )
  autoUpdater.on('update-not-available', () => log.info('updater: already up to date'))
  autoUpdater.on('download-progress', (p) =>
    log.info(`updater: downloading ${Math.round(p.percent)}% (${Math.round(p.bytesPerSecond / 1024)} KB/s)`)
  )
  autoUpdater.on('update-downloaded', (info) =>
    log.info(`updater: ${info.version} downloaded — will install on quit`)
  )
  autoUpdater.on('error', (err) => log.error('updater: error', err))

  autoUpdater.checkForUpdatesAndNotify().catch((err) => {
    // Offline, no release yet, or throttled — not fatal.
    log.warn('updater: check failed', err)
  })
}
