import Button from '../../components/ui/buttons/Button'
import BoardEditor from '../board/BoardEditor'
import { loadBoard, useBoardLoad } from '../board/boardStore'
import type { PanelProps } from '../workspace/types'
import StarterMap from '../starters/StarterMap'
import { isStarterId } from '../starters/starterItems'
import { useMap } from './maps'

/**
 * A map's page: its board editor (features/board). The maps' panel (resources.config.ts), a `fill` panel, so it gets the whole area.
 * The board is read from its file on the server first (once: boardStore). The starter map's page is StarterMap
 */
export default function MapPanel({ id }: PanelProps) {
  // The starter map (features/starters): not on the server until something is drawn on it
  if (isStarterId(id)) return <StarterMap />
  return <SavedMapPanel id={id} />
}

function SavedMapPanel({ id }: PanelProps) {
  const { map, gone } = useMap(id)
  const load = useBoardLoad(id && !gone ? id : null)
  if (!id || gone || load.status === 'gone') return <p className="p-4 text-body text-fg-muted">Map not found.</p>
  if (load.status === 'error') {
    return (
      <div className="flex flex-col items-start gap-2 p-4">
        <p role="alert" className="text-body text-danger">
          {load.error}
        </p>
        <Button variant="secondary" size="sm" onClick={() => void loadBoard(id, true)}>
          Try again
        </Button>
      </div>
    )
  }
  if (!map || load.status === 'loading') return <p className="p-4 text-body text-fg-subtle">Loading…</p>
  return <BoardEditor key={id} mapId={id} />
}
