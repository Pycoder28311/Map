import type { ReactNode } from 'react'
import type { SidebarAction } from '../../selectionButtons'
import type { BoardObject } from '../../types'
import type { Mode } from '../../useMouseTool'
import ObjectArticleSection from './ObjectArticleSection'
import ObjectHeaderRow, { type HeaderAction } from './ObjectHeaderRow'
import ObjectLinksSection from './ObjectLinksSection'
import SelectionActions from './SelectionActions'
import SidePanel from './SidePanel'

/** What every kind's sidebar gets from the editor besides the object itself */
export type ObjectFrameContext = {
  mapId: string
  /** The whole board's objects (for naming links) */
  board: BoardObject[]
  mode: Mode
  onSplit: () => void
  onFocus: () => void
  onErase: () => void
  onDuplicate?: () => void
  /** The row of buttons under the sidebar's title (SelectionActions) */
  onAction: (action: SidebarAction) => void
  onShowBoardObject: (id: number) => void
  /** Opens the left element of the article connected to the object */
  onOpenArticle?: (id: number) => void
}

type Props = ObjectFrameContext & {
  object: BoardObject
  actions?: HeaderAction[]
  /** In place of the header row (a text's own; null: no header row) */
  header?: ReactNode
  /** Before the header row (a point's banner) */
  top?: ReactNode
  /** Before the header's buttons (a point's pin) */
  leading?: ReactNode
  /** Under the links list, at the bottom */
  footerAction?: ReactNode
  /** The kind's own sections */
  children?: ReactNode
}

/**
 * The frame of every object's sidebar: the header row, the kind's own sections (`children`) and, at the bottom, the
 * links section. Lives in the editor's right sidebar.
 */
export default function ObjectFrame({ mapId, object, board, mode, actions, onSplit, onFocus, onErase, onDuplicate, onAction, top, header, leading, onShowBoardObject, onOpenArticle, footerAction, children }: Props) {
  return (
    <SidePanel label={`${object.kind} options`} wide={object.kind === 'point'}>
      {top}
      {header === undefined ? <ObjectHeaderRow {...{ mapId, object, board, mode, actions, onSplit, onFocus, onErase, onDuplicate, leading, onShowBoardObject }} /> : header}
      {/* A line and a border have a title, and it under their title (their own sidebars) */}
      {object.kind !== 'line' && object.kind !== 'border' && <SelectionActions selected={[object]} mode={mode} onAction={onAction} />}
      {/* A line and a closed area have it under their text (AttachedTextField) */}
      {(object.kind === 'shape' || (object.kind === 'border' && object.open)) && onOpenArticle && (
        <ObjectArticleSection mapId={mapId} object={object} board={board} onOpenArticle={onOpenArticle} />
      )}
      {children}
      <ObjectLinksSection mapId={mapId} object={object} board={board} action={footerAction} />
    </SidePanel>
  )
}
