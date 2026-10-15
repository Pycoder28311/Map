import { useState } from 'react'
import { LuHexagon, LuLayers, LuMapPin, LuShapes, LuSpline, LuType } from 'react-icons/lu'
import Button from '../../components/ui/buttons/Button'
import type { PlainIcon } from '../../components/ui/icons/IconSlot'
import BarPopover from './BarPopover'
import { useBoard } from './boardStore'
import { layerLabel, layerList } from './layers'
import { useSelection } from './selection'
import type { ObjectKind } from './types'

const KIND_ICON: Record<ObjectKind, PlainIcon> = { line: LuSpline, border: LuHexagon, shape: LuShapes, text: LuType, point: LuMapPin }

/**
 * The layers button of the title bar (its last one): a list of everything on the board, top first, like Figma's or Penpot's.
 * A click on a row selects that object (`onPick`: the editor switches to the Mouse tool so it shows).
 */
export default function LayersButton({ mapId, onPick }: { mapId: string; onPick: (id: number) => void }) {
  const board = useBoard(mapId)
  const selection = useSelection(mapId)
  const [open, setOpen] = useState(false)
  const objects = layerList(board)

  return (
    <BarPopover
      open={open}
      onOpenChange={setOpen}
      wide
      label="Everything on this map"
      trigger={
        <Button icon={LuLayers} variant={open ? 'secondary' : 'ghost'} aria-expanded={open} onClick={() => setOpen(!open)}>
          Layers
        </Button>
      }
    >
      <p className="px-2 pb-1 text-small text-fg-subtle">Layers · {objects.length}</p>
      {objects.length === 0 ? (
        <p className="px-2 py-6 text-center text-body text-fg-muted">Nothing on this map yet.</p>
      ) : (
        <ul className="flex max-h-[60vh] flex-col gap-0.5 overflow-y-auto">
          {objects.map((o) => {
            const Icon = KIND_ICON[o.kind]
            return (
              <li key={o.id}>
                <button
                  type="button"
                  aria-pressed={selection.has(o.id)}
                  onClick={() => onPick(o.id)}
                  className={`flex w-full cursor-pointer items-center gap-2 rounded-(--corner-sm) px-2 py-1.5 text-start hover:bg-fill ${selection.has(o.id) ? 'bg-fill' : ''}`}
                >
                  <Icon className="size-4 shrink-0 text-fg-muted" aria-hidden />
                  <span className="min-w-0 truncate text-body">{layerLabel(o, board)}</span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </BarPopover>
  )
}
