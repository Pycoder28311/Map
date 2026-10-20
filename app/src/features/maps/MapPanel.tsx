import BoardEditor from '../board/BoardEditor'
import type { PanelProps } from '../workspace/types'
import { useMap } from './maps'

/** A map's page: its board editor (features/board). The maps' panel (resources.config.ts), a `fill` panel, so it gets the whole area */
export default function MapPanel({ id }: PanelProps) {
  const { map, gone } = useMap(id)
  if (!id || gone) return <p className="p-4 text-body text-fg-muted">Map not found.</p>
  if (!map) return <p className="p-4 text-body text-fg-subtle">Loading…</p>
  return <BoardEditor key={id} mapId={id} />
}
