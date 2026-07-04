// electron-builder afterPack hook: on macOS, compile the tiny Swift helper
// (build/mac/set-default-torrent.swift) into the app's Resources so the app can
// offer to become the default .torrent handler at first launch. Runs before
// signing, so electron-builder signs the helper along with the app.
//
// Compiles for the arch being packaged (arm64 or x64). If swiftc is missing the
// helper is simply absent and the first-run prompt no-ops — the build still
// succeeds.
const { Arch } = require('electron-builder')
const { execFileSync } = require('node:child_process')
const { join } = require('node:path')

exports.default = async function afterPack(context) {
  if (context.electronPlatformName !== 'darwin') return

  const archName = Arch[context.arch] // 'x64' | 'arm64'
  const target = archName === 'x64' ? 'x86_64-apple-macos11' : 'arm64-apple-macos11'
  const projectDir = context.packager.projectDir
  const appName = context.packager.appInfo.productFilename // "TorrentDeck"
  const src = join(projectDir, 'build', 'mac', 'set-default-torrent.swift')
  const out = join(context.appOutDir, `${appName}.app`, 'Contents', 'Resources', 'set-default-torrent')

  try {
    execFileSync('swiftc', ['-O', '-target', target, '-o', out, src], { stdio: 'inherit' })
    console.log(`  • afterPack: compiled set-default-torrent (${target})`)
  } catch (err) {
    console.warn(
      `  • afterPack: could not build set-default-torrent helper (${err.message}); ` +
        'the first-run "default torrent app" prompt will be a no-op'
    )
  }
}
