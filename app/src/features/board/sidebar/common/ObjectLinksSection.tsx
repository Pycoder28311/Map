import { LuX } from 'react-icons/lu'
import IconButton from '../../../../components/ui/buttons/IconButton'
import { toggleSidebarLink } from '../../../links/linkPick'
import { LinkName } from '../../linkName'
import NodeNotes from './NodeNotes'
import type { ReactNode } from 'react'
import type { BoardObject } from '../../types'

/** What the object is linked to, the notes attached to it (docs/plans/38), and the kind's own `action` under them, if it has one */
export default function ObjectLinksSection({ mapId, object, board, action }: { mapId: string; object: BoardObject; board: BoardObject[]; action?: ReactNode }) {
  return (
    <div className="flex flex-col gap-2 border-t border-line pt-3">
      {object.links.length > 0 && (
        <ul className="flex flex-col gap-0.5">
          {object.links.map((link, i) => (
            <li key={i} className="flex items-center justify-between gap-2 ps-2 text-body">
              <span className="truncate"><LinkName link={link} board={board} /></span>
              {link.to === 'sidebar' && <IconButton icon={LuX} label="Unlink" onClick={() => toggleSidebarLink(mapId, object.id, link.id)} />}
            </li>
          ))}
        </ul>
      )}
      <NodeNotes mapId={mapId} objectId={object.id} />
      {action}
    </div>
  )
}
