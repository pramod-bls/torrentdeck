/**
 * The component half of the panel registry: PanelTypeId → React component.
 * Metadata (titles, sizes, categories) lives in panels.ts; keep the two in
 * sync — TypeScript enforces it via the Record key type.
 */
import type { PanelTypeId } from '@shared/types'
import { TorrentList } from '@/components/TorrentList'
import { Sidebar } from '@/components/Sidebar'
import { DetailTabsPanel, SingleDetailTab } from '@/components/DetailPanel'
import { StatsPanel } from '@/components/panels/StatsPanel'

export const PANEL_COMPONENTS: Record<PanelTypeId, () => React.JSX.Element> = {
  'torrent-list': () => <TorrentList />,
  filters: () => <Sidebar />,
  detail: () => <DetailTabsPanel />,
  'detail-general': () => <SingleDetailTab tab="general" />,
  'detail-files': () => <SingleDetailTab tab="files" />,
  'detail-peers': () => <SingleDetailTab tab="peers" />,
  'detail-trackers': () => <SingleDetailTab tab="trackers" />,
  stats: () => <StatsPanel />
}
