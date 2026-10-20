import type { ReactNode } from 'react'
import type { BoardObject } from '../../types'
import type { Mode } from '../../useMouseTool'
import ObjectHeaderRow, { type HeaderAction } from './ObjectHeaderRow'
import ObjectLinksSection from './ObjectLinksSection'
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
  onShowBoardObject: (id: number) => void
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
export default function ObjectFrame({ mapId, object, board, mode, actions, onSplit, onFocus, onErase, onDuplicate, top, header, leading, onShowBoardObject, footerAction, children }: Props) {
  return (
    <SidePanel label={`${object.kind} options`} wide={object.kind === 'point'}>
      {top}
      {header === undefined ? <ObjectHeaderRow {...{ mapId, object, board, mode, actions, onSplit, onFocus, onErase, onDuplicate, leading, onShowBoardObject }} /> : header}
      {children}
      <ObjectLinksSection mapId={mapId} object={object} board={board} action={footerAction} />
    </SidePanel>
  )
}
