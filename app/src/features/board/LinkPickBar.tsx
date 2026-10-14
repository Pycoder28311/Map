import { LuCheck } from 'react-icons/lu'
import Button from '../../components/ui/buttons/Button'
import { stopLinkPick, useLinkPick } from '../links/linkPick'
import { FLOAT } from './floating'
import type { BoardObject } from './types'

/** Bottom centre while linking: says what is being linked and ends it */
export default function LinkPickBar({ mapId, board }: { mapId: string; board: BoardObject[] }) {
  const pick = useLinkPick()
  if (!pick || pick.mapId !== mapId) return null
  const object = board.find((o) => o.id === pick.objectId)
  return (
    <div role="status" className={`pointer-events-auto absolute start-1/2 bottom-16 flex -translate-x-1/2 items-center gap-3 py-1.5 ps-4 pe-1.5 ${FLOAT}`}>
      <span className="text-body">
        Linking <strong className="font-medium">{object?.name || object?.kind || 'object'}</strong>: click the notes in the sidebar
      </span>
      <Button variant="primary" icon={LuCheck} onClick={stopLinkPick}>
        Done
      </Button>
    </div>
  )
}
