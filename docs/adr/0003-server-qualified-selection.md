# 0003 — Server-qualified selection and grouped multi-server panels

Date: 2026-07-02
Status: accepted, implemented (v0.3). Partially superseded (v0.8): the **Default Server**
introduced here was removed — every Panel/dialog now names its own server(s) and the
Workspace is global. Server-qualified selection (decision 1) still stands.

## Context

v0.3 lets one Torrents panel show several daemons at once. Transmission torrent
ids are only unique per daemon, so "selected torrent #12" is ambiguous the moment
two servers are visible. Every consumer of selection — bulk actions, the detail
panels, remove/labels dialogs — must know which daemon a torrent belongs to.

## Decision

1. **Selection carries its server.** UI selection is `{ profileId, ids[] }` and the
   detail target is `{ profileId, id }`. Multi-select never spans servers: selecting
   in one server's group replaces a selection held in another. Every bulk operation
   therefore remains a single RPC to a single daemon — no partial-failure fan-out.
2. **Multi-server panels group by server** (user choice over a merged list): one
   collapsible section per daemon, each backed by its own RTK Query subscription, so
   an unreachable server degrades only its own section. Filters and sort are applied
   per group from the panel's config.
3. **Per-panel filters/sort/scope** live in the persisted `TorrentsPanelConfig`
   (layout schema v2). The retired v1 global-filters sidebar migrates away via the
   versioned-layout mechanism from ADR-0002. The toolbar switcher becomes the
   **Default Server**: the add-torrent target, settings/stats subject, and the
   resolution of a panel's `'default'` scope.

## Consequences

- Keyboard navigation can walk across group boundaries (re-anchoring the selection
  to the new server), but ⇧-extension and ⌘A stop at their server's edge.
- Aggregations for filter options read the RTK Query cache without subscribing
  (`endpoints.getTorrents.select`), so a panel's filter bar adds zero extra polling.
- "Select across servers and act on all" is deliberately unsupported; if it's ever
  wanted, it must become a fan-out with per-server error reporting.

## Alternatives considered

**Composite ids (`profileId:torrentId`) with cross-server multi-select** — rejected:
every action becomes a multi-daemon fan-out with partial failures for marginal
benefit. **Merged flat list with server badges** — offered; user chose grouping for
clearer ownership.
