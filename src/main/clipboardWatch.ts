/**
 * Optional clipboard watcher: while the `watchClipboardMagnets` pref is on and
 * the window is open, poll the clipboard and, when a *new* magnet link appears,
 * push it to the renderer via the existing `open-magnet` channel (which opens
 * the prefilled Add dialog). Opt-in and off by default — polling reads whatever
 * you copy, so it's a deliberate choice.
 */
import { clipboard, type BrowserWindow } from 'electron'
import { getPrefs } from './profiles'

let timer: ReturnType<typeof setInterval> | null = null
let lastMagnet = ''

/**
 * Begin polling (idempotent). The interval always runs but only acts while the
 * pref is enabled, so toggling the setting takes effect on the next tick with
 * no extra wiring. Seeds the last-seen magnet from the current clipboard so a
 * link already sitting there at launch isn't offered unprompted.
 */
export function startClipboardWatch(getWindow: () => BrowserWindow | null): void {
  if (timer) return
  const cur = clipboard.readText().trim()
  if (cur.startsWith('magnet:')) lastMagnet = cur
  timer = setInterval(() => {
    if (!getPrefs().watchClipboardMagnets) return
    const win = getWindow()
    if (!win || win.isDestroyed()) return
    const text = clipboard.readText().trim()
    if (text.startsWith('magnet:') && text !== lastMagnet) {
      lastMagnet = text
      win.webContents.send('open-magnet', text)
    }
  }, 1500)
}
