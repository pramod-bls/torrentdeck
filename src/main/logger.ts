/**
 * Central logging for the main process, backed by electron-log.
 *
 * Writes to a rotating file (macOS: ~/Library/Logs/TorrentDeck/main.log,
 * Windows: %USERPROFILE%\AppData\Roaming\TorrentDeck\logs\main.log, Linux:
 * ~/.config/TorrentDeck/logs/main.log) and mirrors to the console in dev.
 * Uncaught exceptions and unhandled rejections are captured to the log so a
 * released build leaves a breadcrumb instead of dying silently.
 *
 * `log.initialize()` installs the bridge that lets the renderer log through the
 * same file via electron-log's preload/IPC.
 */
import log from 'electron-log/main'
import { app } from 'electron'
import { is } from '@electron-toolkit/utils'

export function initLogging(): typeof log {
  log.initialize()

  log.transports.file.level = 'info'
  log.transports.file.maxSize = 5 * 1024 * 1024 // 5 MB, then rotates to main.old.log
  log.transports.console.level = is.dev ? 'debug' : 'info'
  log.transports.console.format = '{h}:{i}:{s}.{ms} [{level}] {text}'

  // Route uncaught errors/rejections to the log (no modal in production).
  log.errorHandler.startCatching({ showDialog: false })

  log.info(
    `TorrentDeck ${app.getVersion()} starting — electron ${process.versions.electron}, ` +
      `node ${process.versions.node}, ${process.platform}/${process.arch}`
  )

  return log
}

export { log }
