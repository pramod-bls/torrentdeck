/**
 * The component half of the panel registry: PanelTypeId → React component.
 * Metadata (titles, sizes, categories) lives in panels.ts; keep the two in
 * sync — TypeScript enforces it via the Record key type. Components receive
 * the WorkspaceItem so per-instance panels (Torrents) can read their config.
 */
import type { PanelTypeId, WorkspaceItem } from '@shared/types'
import { TorrentsPanel } from '@/components/panels/TorrentsPanel'
import { DetailTabsPanel, SingleDetailTab } from '@/components/DetailPanel'
import { StatsPanel } from '@/components/panels/StatsPanel'
import { SpeedGraphPanel } from '@/components/panels/SpeedGraphPanel'

export const PANEL_COMPONENTS: Record<
  PanelTypeId,
  (item: WorkspaceItem) => React.JSX.Element
> = {
  'torrent-list': (item) => <TorrentsPanel item={item} />,
  detail: () => <DetailTabsPanel />,
  'detail-general': () => <SingleDetailTab tab="general" />,
  'detail-files': () => <SingleDetailTab tab="files" />,
  'detail-peers': () => <SingleDetailTab tab="peers" />,
  'detail-trackers': () => <SingleDetailTab tab="trackers" />,
  stats: () => <StatsPanel />,
  'speed-graph': (item) => <SpeedGraphPanel item={item} />
}
