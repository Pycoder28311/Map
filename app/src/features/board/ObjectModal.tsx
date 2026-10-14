import type { ReactNode } from 'react'
import { LuX } from 'react-icons/lu'
import IconButton from '../../components/ui/buttons/IconButton'
import { toggleSidebarLink } from '../links/linkPick'
import { linkName } from './linkName'
import LinkObjectsButton from './LinkObjectsButton'
import ObjectHeaderRow, { type HeaderAction } from './ObjectHeaderRow'
import type { BoardObject } from './types'
import type { Mode } from './useMouseTool'
import SidePanel from './SidePanel'

type Props = {
  mapId: string
  object: BoardObject
  board: BoardObject[]
  mode: Mode
  actions?: HeaderAction[]
  onSplit: () => void
  onFocus: () => void
  onErase: () => void
  onDuplicate?: () => void
  /** Before the header row (a point's banner) */
  top?: ReactNode
  /** Before the header's buttons (a point's pin) */
  leading?: ReactNode
  onShowBoardObject: (id: number) => void
  /** The kind's own options (plans 19–22 fill this) */
  children?: ReactNode
}

/**
 * The frame of every object's modal: the header row, the kind's own options (`children`) and, at the bottom, the
 * "Link to other objects" button with the list of what is linked. Lives in the editor's right sidebar.
 */
export default function ObjectModal({ mapId, object, board, mode, actions, onSplit, onFocus, onErase, onDuplicate, top, leading, onShowBoardObject, children }: Props) {
  return (
    <SidePanel label={`${object.kind} options`}>
      {top}
      <ObjectHeaderRow {...{ mapId, object, board, mode, actions, onSplit, onFocus, onErase, onDuplicate, leading, onShowBoardObject }} />
      {children}
      <div className="flex flex-col gap-2 border-t border-line pt-3">
        {object.links.length > 0 && (
          <ul className="flex flex-col gap-0.5">
            {object.links.map((link, i) => (
              <li key={i} className="flex items-center justify-between gap-2 ps-2 text-body">
                <span className="truncate">{linkName(link, board)}</span>
                {link.to === 'sidebar' && <IconButton icon={LuX} label={`Unlink ${linkName(link, board)}`} onClick={() => toggleSidebarLink(mapId, object.id, link.id)} />}
              </li>
            ))}
          </ul>
        )}
        <LinkObjectsButton mapId={mapId} objectId={object.id} />
      </div>
    </SidePanel>
  )
}
