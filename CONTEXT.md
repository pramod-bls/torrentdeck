# Context

Glossary of domain terms for Transmission Remote, a desktop client that remote-controls
Transmission BitTorrent daemons. Terms here are the canonical language for code, UI copy,
and discussion. Implementation details do not belong in this file.

## Terms

### Server Profile
A saved connection definition for one Transmission daemon: name, address, port, TLS
settings, credentials, and per-profile UI preferences. A user may have many Server
Profiles (home NAS, seedbox, …).

### Default Server
The Server Profile picked in the toolbar (remembered across restarts). It is the target
for adding torrents, the subject of session settings and the status bar, and what a
Torrents Panel with "default" scope shows. Individual Panels may scope themselves to
other servers — the Default Server is a convenience anchor, not a connection limit.

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
A grouping over Statuses: All, Downloading, Seeding, Paused, Verifying, Error. Together
with the Tracker filter, Label filter, and Search it forms a Torrents Panel's filters —
owned by each Panel individually, never global.

### Label
A free-form tag stored on a Torrent by the daemon (Transmission "labels"). Used for
user-defined grouping and filtering.

### Torrents Panel
A Panel showing torrents from one or more servers (its Scope), grouped by server when
several are shown. Each instance owns its filters, sort, search, and view mode
(cards or table). Also called the Torrent List.

### Scope
The set of Server Profiles a Torrents Panel displays: either "default" (follow the
Default Server) or an explicit list of servers.

### Selection
The torrents currently highlighted, always belonging to exactly one server
(server-qualified). Bulk actions apply to the Selection and are sent to its server.

### Detail Panel
The collapsible right-side panel inspecting the selected Torrent, with tabs:
General, Files, Peers, Trackers.

### Magnet Link
A `magnet:` URI that adds a Torrent without a metainfo file. The app registers as the
OS handler for these.

### Panel
A self-contained view (Torrents Panel, a Detail tab, session stats, Speed Graph) that
the user can add to, remove from, and rearrange within the Workspace. One Panel type
may appear as several independent instances.

### Speed Graph
A Panel plotting one server's download/upload throughput over a selectable time
window, fed by the same polling that drives the stats displays.

### Swarm
The peers available for a Torrent across its trackers. The list shows the best
seeder/leecher counts any tracker reports, with a health tint (none/few/plenty).

### Workspace
The user-composed arrangement of Panels in the main window, saved per Server Profile.
The classic three-zone arrangement is just the default Workspace.
