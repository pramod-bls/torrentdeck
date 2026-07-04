// Tiny helper compiled + bundled into TorrentDeck.app/Contents/Resources during
// the macOS build (see build/afterPack.cjs). Electron has no API for file-type
// defaults, so the main process shells out to this to check / set the default
// handler for the `org.bittorrent.torrent` UTI (see src/main/torrentDefault.ts).
//
//   set-default-torrent check          → prints the current default bundle id
//   set-default-torrent set <bundleid> → sets it, prints the new default, exits non-zero on failure
import Foundation
import CoreServices

let uti = ("org.bittorrent.torrent" as NSString) as CFString

func currentDefault() -> String {
  if let h = LSCopyDefaultRoleHandlerForContentType(uti, .all)?.takeRetainedValue() {
    return h as String
  }
  return ""
}

let args = CommandLine.arguments
if args.count >= 2, args[1] == "check" {
  print(currentDefault())
} else if args.count >= 3, args[1] == "set" {
  let bundleID = (args[2] as NSString) as CFString
  let status = LSSetDefaultRoleHandlerForContentType(uti, .all, bundleID)
  print(currentDefault())
  exit(status == 0 ? 0 : 1)
} else {
  FileHandle.standardError.write(Data("usage: set-default-torrent check | set <bundleid>\n".utf8))
  exit(2)
}
