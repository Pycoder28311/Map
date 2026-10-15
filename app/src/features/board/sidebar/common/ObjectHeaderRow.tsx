import { useRef, useState, type ReactNode } from 'react'
import { LuCopy, LuEraser, LuFocus, LuSplit } from 'react-icons/lu'
import IconButton from '../../../../components/ui/buttons/IconButton'
import HoverInfo from '../../../../components/ui/overlays/HoverInfo'
import { nameArea } from '../../areaName'
import { changeObjects, updateObject } from '../../boardStore'
import ForwardLink from '../../ForwardLink'
import type { Mode } from '../../useMouseTool'
import type { BoardObject } from '../../types'

export type HeaderAction = 'split' | 'focus' | 'eraser' | 'duplicate'

type Props = {
  mapId: string
  object: BoardObject
  board: BoardObject[]
  mode: Mode
  /** Left to right, before the name (map.md: split, focus, eraser). A kind's modal passes its own set */
  actions?: HeaderAction[]
  onSplit: () => void
  onFocus: () => void
  onErase: () => void
  /** The duplicate button (a point's modal) */
  onDuplicate?: () => void
  /** Before the buttons: the point's pin */
  leading?: ReactNode
  onShowBoardObject: (id: number) => void
}

/** What each kind can do with the header's buttons (a split or erased area becomes lines) */
const CAN: Record<HeaderAction, (o: BoardObject) => boolean> = {
  split: (o) => o.kind === 'line' || o.kind === 'border',
  focus: () => true,
  eraser: (o) => o.kind === 'line' || o.kind === 'border',
  duplicate: (o) => o.kind === 'point',
}

/**
 * The first row of every object's modal: the buttons, the name (renames on Enter or leaving; Esc undoes) and the
 * forward-link icon. Shared by the line, border, text and point modals.
 */
export default function ObjectHeaderRow({ mapId, object, board, mode, actions = ['split', 'focus', 'eraser'], onSplit, onFocus, onErase, onDuplicate, leading, onShowBoardObject }: Props) {
  const [draft, setDraft] = useState<string | null>(null)
  const cancelled = useRef(false)

  const commit = () => {
    const name = (draft ?? object.name).trim()
    if (!cancelled.current && name !== object.name) {
      // An area's name is a text on the map as well: they change together
      if (object.kind === 'border') changeObjects(mapId, nameArea({ nextId: 0, objects: board }, object.id, name))
      else updateObject(mapId, object.id, { name })
    }
    cancelled.current = false
    setDraft(null)
  }

  const button = (action: HeaderAction): ReactNode => {
    const enabled = CAN[action](object)
    const spec = {
      split: { icon: LuSplit, label: 'Split', text: 'Click it, then click the point of the line to cut it in two. Double-clicking a line does the same.', on: onSplit, pressed: mode === 'split' },
      focus: { icon: LuFocus, label: 'Focus', text: 'Zoom the map to this object.', on: onFocus, pressed: false },
      duplicate: { icon: LuCopy, label: 'Duplicate', text: 'Make a copy of this object next to it.', on: onDuplicate ?? (() => {}), pressed: false },
      eraser: { icon: LuEraser, label: 'Eraser', text: 'Drag over the object to erase the parts under the circle.', on: onErase, pressed: mode === 'erase' },
    }[action]
    return (
      <HoverInfo key={action} title={spec.label} text={enabled ? spec.text : 'Not for this kind of object yet.'} side="bottom">
        <IconButton icon={spec.icon} label={spec.label} variant={spec.pressed ? 'primary' : 'ghost'} aria-pressed={spec.pressed} disabled={!enabled} onClick={spec.on} />
      </HoverInfo>
    )
  }

  return (
    <div className="flex items-center gap-1">
      {leading}
      {actions.map(button)}
      <input
        value={draft ?? object.name}
        placeholder="Name"
        aria-label="Name"
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur()
          if (e.key === 'Escape') {
            e.preventDefault()
            e.stopPropagation()
            cancelled.current = true
            e.currentTarget.blur()
          }
        }}
        className="min-w-0 flex-1 rounded-(--btn-close-radius) bg-fill px-2 py-1 text-body outline-none focus-visible:outline-2 focus-visible:outline-accent"
      />
      <ForwardLink object={object} board={board} onShowBoardObject={onShowBoardObject} />
    </div>
  )
}
