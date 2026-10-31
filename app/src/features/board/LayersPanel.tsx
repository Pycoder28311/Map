import { LuX } from 'react-icons/lu'
import IconButton from '../../components/ui/buttons/IconButton'
import { useBoard } from './boardStore'
import { FLOAT } from './floating'
import { layerLabel, layerList } from './layers'
import { useSelection } from './selection'
import { KIND_ICON } from './layerIcons'
import { LIST_ITEM } from '../../components/ui/rowStyles'

/**
 * The layers of the left panel (the title bar's ⋯ › Layers): a list of everything on the board, top first, like Figma's or Penpot's,
 * as tall as the editor. A click on a row selects that object (`onPick`: the editor switches to the Mouse tool so it shows).
 */
export default function LayersPanel({ mapId, onPick, onClose }: { mapId: string; onPick: (id: number) => void; onClose: () => void }) {
  const board = useBoard(mapId)
  const selection = useSelection(mapId)
  const objects = layerList(board)

  return (
    <section aria-label="Everything on this map" className={`pointer-events-auto flex min-h-0 flex-1 flex-col p-2 ${FLOAT}`}>
      <div className="flex items-center gap-2 ps-2">
        <h2 className="min-w-0 flex-1 text-small text-fg-subtle">Layers · {objects.length}</h2>
        <IconButton icon={LuX} label="Close the layers" size="sm" onClick={onClose} />
      </div>
      {objects.length === 0 ? (
        <p className="px-2 py-6 text-center text-body text-fg-muted">Nothing on this map yet.</p>
      ) : (
        <ul className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto">
          {objects.map((o) => {
            const Icon = KIND_ICON[o.kind]
            return (
              <li key={o.id}>
                <button
                  type="button"
                  aria-pressed={selection.has(o.id)}
                  onClick={() => onPick(o.id)}
                  className={`${LIST_ITEM} ${selection.has(o.id) ? 'bg-fill' : ''}`}
                >
                  <Icon className="size-4 shrink-0 text-fg-muted" aria-hidden />
                  <span className="min-w-0 truncate text-body">{layerLabel(o, board)}</span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
