import { LuCheck, LuLink } from 'react-icons/lu'
import Button from '../../components/ui/buttons/Button'
import { startLinkPick, stopLinkPick, useLinkPick } from '../links/linkPick'

/** "Link to other objects": opens the sidebar with a link icon on the notes; click one to link it. The same button ends it */
export default function LinkObjectsButton({ mapId, objectId }: { mapId: string; objectId: number }) {
  const pick = useLinkPick()
  const on = pick?.mapId === mapId && pick.objectId === objectId
  return (
    <Button variant={on ? 'primary' : 'secondary'} icon={on ? LuCheck : LuLink} onClick={() => (on ? stopLinkPick() : startLinkPick({ mapId, objectId }))} className="w-full">
      {on ? 'Done linking' : 'Link to other objects'}
    </Button>
  )
}
