import { updateObject } from './boardStore'
import type { Patch } from './boardStore'
import { lineStylePatch } from './drawLine'
import BorderOptions from './BorderOptions'
import ColoursPanel from './ColoursPanel'
import LineOptions from './LineOptions'
import ObjectModal from './ObjectModal'
import PointModal from './PointModal'
import ConnectField from './ConnectField'
import ShapeOptions from './ShapeOptions'
import TextOptions from './TextOptions'
import type { BoardObject } from './types'
import type { Mode } from './useMouseTool'

/** An unfinished change of one object (a slider still held), painted but not saved */
export type StylePreview = { id: number; patch: Patch }

type Props = {
  mapId: string
  /** The selected objects */
  selected: BoardObject[]
  /** The whole board's objects (for naming links) */
  board: BoardObject[]
  mode: Mode
  onSplit: () => void
  onFocus: () => void
  onErase: () => void
  onDuplicate: () => void
  onShowBoardObject: (id: number) => void
  onPreview: (preview: StylePreview | null) => void
}

/** The panel at the top right: the object's modal for one object, the colours for several, nothing for none */
export default function SelectionPanel({ selected, onPreview, ...rest }: Props) {
  if (selected.length === 0) return null
  if (selected.length > 1) return <ColoursPanel mapId={rest.mapId} selected={selected} />
  const object = selected[0]
  // A held slider previews; a finished change is one undo step
  const apply = (patch: Patch, commit: boolean) => {
    if (commit) {
      onPreview(null)
      updateObject(rest.mapId, object.id, patch)
    } else onPreview({ id: object.id, patch })
  }
  if (object.kind === 'point') return <PointModal object={object} apply={apply} {...rest} />
  return (
    <ObjectModal object={object} {...rest}>
      {object.kind === 'line' && <LineOptions kind="line" style={object.style} onChange={(style, commit) => apply(lineStylePatch(object, style), commit)} />}
      {object.kind === 'border' && (
        <BorderOptions
          value={{ style: object.style, fill: object.fill, shape: null, param: 0 }}
          description={object.description}
          onDescription={(description) => apply({ description }, true)}
          onChange={(patch, commit) => apply({ ...(patch.style ? { style: patch.style } : {}), ...(patch.fill !== undefined ? { fill: patch.fill } : {}) }, commit)}
        />
      )}
      {object.kind === 'text' && (
        <>
          <TextOptions mapId={rest.mapId} text={object} />
          {!object.isName && (
            <ConnectField
              text={object}
              board={rest.board}
              onChange={(id) => {
                // The link follows the connection: it opens the object the text is tied to
                const links = object.links.filter((l) => !(l.to === 'board' && l.id === object.attach))
                apply({ attach: id ?? undefined, links: id === null ? links : [...links, { to: 'board', id }] }, true)
              }}
            />
          )}
        </>
      )}
      {object.kind === 'shape' && <ShapeOptions object={object} onChange={(patch, commit) => apply(patch, commit)} />}
    </ObjectModal>
  )
}
