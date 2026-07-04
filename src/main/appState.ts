/**
 * Tiny shared flag for "the app is really quitting" (vs. close-to-tray hiding
 * the window). Both the window close handler and the auto-updater's
 * quitAndInstall need to agree on this, so it lives outside index.ts to avoid
 * an import cycle.
 */
let quitting = false

export function isQuitting(): boolean {
  return quitting
}

export function setQuitting(value = true): void {
  quitting = value
}
