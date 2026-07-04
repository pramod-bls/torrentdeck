# 0005 — Size Filter: client-side, best-effort, Deluge-prefetch

Date: 2026-07-04
Status: accepted, planned

## Context

Users adding torrents (especially scene releases via magnet links) often get junk files
bundled in — tiny readme/ad/sample `.txt`/`.html` files — that they never want on disk.
The request: skip files below a size threshold automatically.

No daemon has a native "don't download files under X MB" setting. All three
(Transmission, Deluge, qBittorrent) *do* expose per-file "don't download"
(`files-unwanted` / `file_priorities: 0` / per-file `priority 0`), which the app already
uses for the Add dialog's manual per-file selection. So a size filter is necessarily a
**client-side rule that marks sub-threshold files not-wanted** — the only question is
*when* it can run, which differs sharply by daemon and by add type.

The decisive constraint is metadata timing for **magnet links**: a magnet carries no file
list until the daemon fetches metadata from peers. Preview-before-add is daemon-specific:

- **Deluge:** `core.prefetch_magnet_metadata(magnet, timeout)` fetches the info dict
  *without* adding the torrent — a true before-add preview.
- **Transmission / qBittorrent:** no metadata-preview in their RPC/WebUI APIs. Metadata is
  known only *after* the torrent is added and running.

A uniform before-add preview would require the app to run its own DHT/`ut_metadata`
client. Rejected: it puts the *client's* home IP into the swarm/DHT for every previewed
infohash, undermining the common remote-seedbox-behind-VPN setup, and adds a heavy
dependency.

## Decision

1. **Size Filter is a per–Server Profile client-side rule.** A **Size Threshold** (MB,
   default Off/0) stored on the profile (not the daemon), edited in the server editor.
   Files below it are set not-wanted. It never skips a torrent's only file and never
   leaves a torrent with nothing to download. New adds only — no retroactive "apply to
   existing torrent" action. *(Amended in v0.1.5 — see below.)*

2. **Best-effort filtering, not a hard guarantee.** For magnets on Transmission and
   qBittorrent we **add → poll for the file list → unwant** sub-threshold files the instant
   metadata resolves. A sub-second window remains where the daemon may grab a few
   KB-sized files before we flag them; those are set not-wanted (no *further* download).
   We do **not** delete already-downloaded data. Rejected "strict" (add-paused, filter,
   then start): a paused magnet historically does not fetch metadata on Transmission, so
   strict would break the feature on the most common daemon. Strict-paused behavior will be
   tested against a live Transmission before any future reversal.

3. **Deluge is upgraded to perfect via prefetch.** When a Deluge profile adds a magnet, we
   `prefetch_magnet_metadata` first, compute the unwanted set, and add with file priorities
   already applied — zero junk touches disk. On prefetch timeout (seederless magnet) we
   fall back to the same add-then-filter path. This per-daemon asymmetry is deliberate.

4. **`.torrent` adds filter at add time.** Files are known locally (parsed via `bencode`),
   so the Add dialog computes the unwanted set before sending — no race. The dialog gains a
   log-scale **size slider** (snap stops, typeable MB, defaulting to the server threshold)
   that is **master** over the per-file checkboxes: dragging it re-derives the checked set
   by size; manual tweaks stick until the next drag.

## Consequences

- The bandwidth/space goal is met on every daemon; only *tiny* files may momentarily touch
  disk on Transmission/qBt, and only until the next poll.
- Deluge carries a unique prefetch code path — the one daemon where the filter is exact.
- The threshold lives in app/profile config, so it survives daemon restarts and needs no
  daemon support; a daemon that somehow lacked per-file wanted would simply not offer it
  (capability-gated), but all three support it today.
- Revisiting "strict" later is a localized change (add-paused + a metadata wait) gated on
  the Transmission test; nothing here precludes it.

## Update — v0.1.5: retroactive apply in the Files tab

The "new adds only" scope in decision 1 was relaxed. The detail **Files** tab gained a
"Skip files under" slider that applies the same `unwantedBySizeThreshold` computation to an
*already-added* torrent. It's a **local preview** (dragging only changes what the tree
shows) committed on **Apply** in a single `setTorrent` call — deliberately explicit rather
than live-firing daemon calls per drag. This reuses the existing per-file wanted plumbing
and the shared helper, so it carries no new risk; the original "no retroactive action"
stance was simply conservative, and the preview-then-apply model addresses the concern
(accidental bulk changes) that motivated it.

## Alternatives considered

**Client-side DHT metadata fetch** for a uniform before-add preview — rejected (leaks the
client IP into the swarm, heavy dependency). **Strict add-paused-then-filter** — rejected
for v1 (breaks on Transmission magnets, the primary use case). **Auto-deleting slipped
junk** — rejected (surprising destructive behavior for a few KB; unwant is enough).
**Storing the threshold as a daemon session setting** — impossible; no daemon has one.
