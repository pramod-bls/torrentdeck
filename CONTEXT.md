# Context

Glossary of domain terms for Transmission Remote, a desktop client that remote-controls
Transmission BitTorrent daemons. Terms here are the canonical language for code, UI copy,
and discussion. Implementation details do not belong in this file.

## Terms

### Server Profile
A saved connection definition for one Transmission daemon: name, address, port, TLS
settings, credentials, and per-profile UI preferences. A user may have many Server
Profiles (home NAS, seedbox, …).

### Active Server
The single Server Profile the app is currently connected to. Exactly zero or one profile
is active at a time; switching the Active Server replaces everything shown in the window.
(Data is nevertheless always scoped per profile so that showing several servers at once
can become possible later.)

### Session
The daemon-wide state of the Active Server: global speed limits, download directory,
encryption policy, port settings, and statistics. Distinct from any individual torrent.

### Torrent
One transfer known to the Active Server, identified by its daemon-assigned id and its
hash. A Torrent has a Status, content Files, Peers, Trackers, and optional Labels.

### Status
The daemon-reported lifecycle state of a Torrent: stopped, queued to verify, verifying,
queued to download, downloading, queued to seed, or seeding. The UI groups these into
the coarser Status Filters.

### Status Filter
A sidebar grouping over Statuses: All, Downloading, Seeding, Paused, Error. Combines
with the Tracker filter, Label filter, and Search to narrow the Torrent List.

### Label
A free-form tag stored on a Torrent by the daemon (Transmission "labels"). Used for
user-defined grouping and filtering.

### Torrent List
The central view: one row per Torrent on the Active Server, filtered, searched, and
sorted client-side.

### Detail Panel
The collapsible right-side panel inspecting the selected Torrent, with tabs:
General, Files, Peers, Trackers.

### Magnet Link
A `magnet:` URI that adds a Torrent without a metainfo file. The app registers as the
OS handler for these.

### Panel
A self-contained view (Torrent List, a Detail tab, filters, stats) that the user can
add to, remove from, and rearrange within the Workspace. One Panel type may appear as
several independent instances.

### Workspace
The user-composed arrangement of Panels in the main window, saved per Server Profile.
The classic three-zone arrangement is just the default Workspace.
