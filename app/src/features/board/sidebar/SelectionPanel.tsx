import { updateObject } from '../boardStore'
import type { Patch } from '../boardStore'
import type { BoardObject } from '../types'
import type { Mode } from '../useMouseTool'
import BorderSidebar from './border/BorderSidebar'
import LineSidebar from './line/LineSidebar'
import PointSidebar from './point/PointSidebar'
import SelectionColoursSidebar from './selection/SelectionColoursSidebar'
import ShapeSidebar from './shape/ShapeSidebar'
import TextSidebar from './text/TextSidebar'

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
  /** The Point tool of the Line and Border tools: on, and a way to switch it (a line's and an area's sidebars have its button) */
  pointTool?: boolean
  onPointTool?: () => void
}

/** The panel at the top right: the sidebar of the object's kind for one object, the colours for several, nothing for none */
export default function SelectionPanel({ selected, onPreview, pointTool, onPointTool, ...context }: Props) {
  if (selected.length === 0) return null
  if (selected.length > 1) return <SelectionColoursSidebar mapId={context.mapId} selected={selected} />
  const object = selected[0]
  // A held slider previews; a finished change is one undo step
  const apply = (patch: Patch, commit: boolean) => {
    if (commit) {
      onPreview(null)
      updateObject(context.mapId, object.id, patch)
    } else onPreview({ id: object.id, patch })
  }
  switch (object.kind) {
    case 'point':
      return <PointSidebar object={object} apply={apply} {...context} />
    case 'line':
      return <LineSidebar object={object} apply={apply} pointTool={pointTool} onPointTool={onPointTool} {...context} />
    case 'border':
      return <BorderSidebar object={object} apply={apply} pointTool={pointTool} onPointTool={onPointTool} {...context} />
    case 'shape':
      return <ShapeSidebar object={object} apply={apply} {...context} />
    case 'text':
      return <TextSidebar object={object} apply={apply} {...context} />
  }
}
