import { findMap } from '../../mocks/projects'
import { useMockObjects } from '../../mocks/projectsStore'
import BoardEditor from '../board/BoardEditor'
import type { PanelProps } from '../workspace/types'

/** A map's page: its board editor (features/board). Registered as a `fill` panel, so it gets the whole area */
export default function MapPanel({ id }: PanelProps) {
  useMockObjects() // re-render on changes (the name, the map being deleted…)
  const map = findMap(id)
  if (!map) return <p className="p-4 text-body text-fg-muted">Map not found.</p>
  return <BoardEditor key={map.id} mapId={map.id} />
}
