# 0002 — Flexible panel workspace on react-grid-layout

Date: 2026-07-02
Status: accepted, implemented (v0.2 — `src/renderer/src/features/workspace/`)

## Context

v0.1 shipped a fixed three-zone layout (sidebar / list / detail panel). The owner
wants the UI model proven in his FlimViewer app
(`~/projects/electron_frontend_for_fastapi_docker_server`): every major view is a
panel that can be added, removed, dragged, and resized by the user, so the window
composition is personal rather than prescribed — e.g. a monitoring-only layout
(list + stats), or a triage layout (two lists with different filters + detail).

The reference implementation was reviewed. Its pattern: `react-grid-layout`
(responsive grid, drag handle per panel header, S/SE resize), a declarative
registry mapping panel-type names → components, UUID instance ids so one type can
appear multiple times, an "Add window" picker driven by the same registry, and
layout persisted per page via Redux middleware → IPC → electron-store.

## Decision

Adopt the same pattern for TorrentDeck in v0.2:

- **Library:** `react-grid-layout` — proven in the reference app, actively
  maintained, no dock-tab complexity we don't need.
- **Panel registry:** single module declaring `{ type, title, category, component,
  defaultSize, multiInstance }`; drives the picker, rendering, and validation.
- **Instances:** UUID ids; per-instance panel state (e.g. a list panel's filter)
  lives in the `ui` slice keyed by instance id.
- **Persistence:** layout stored **per Server Profile** through the existing
  profiles/prefs electron-store path, written by Redux middleware (side effect
  stays out of reducers). A built-in default layout ships and "Reset layout" is
  always available.
- **Versioned schema:** the persisted layout carries `version: number` with
  explicit migrations — the one gap identified in the reference app.

## Consequences

- The current fixed components (Sidebar, TorrentList, DetailPanel, StatusBar-level
  stats) get wrapped as panel types; the three-zone layout becomes merely the
  default layout, preserving current UX for users who never touch it.
- Selection/detail coupling must move from "the one detail panel" to "detail panels
  subscribe to selection", so multiple detail panels remain coherent.
- Adds a dependency (`react-grid-layout`) and a layout-migration responsibility.

## Alternatives considered

**Dock/tab systems (flexlayout-react, dockview, react-mosaic)** — richer (tab
stacks, floating windows) but heavier mental model and API; the reference app shows
grid-of-cards is sufficient for this product. **Hand-rolled CSS grid + toggles** —
visibility toggles alone don't give rearrange/resize, which is the point.
**Keep fixed layout** — rejected by product direction (PRD §6).
