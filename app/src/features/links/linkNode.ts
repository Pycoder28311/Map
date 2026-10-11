// Linking notes to projects / maps by drag & drop: the 'link' drop zone and the props of a link node
// (a DropIcon) for any target, in the sidebar or in a pane's list.
import { LuLink } from 'react-icons/lu'
import { fallInto } from '../../components/ui/drop/fallInto'
import { isNoteLike } from '../../mocks/projects'
import { canLink, linkNote } from '../../mocks/projectsStore'
import { objectOf } from '../drag/objectDrag'
import { useObjectDrop, type DropTargetValue, type ZoneHandler } from '../drag/objectDrop'
import { useWorkspace } from '../workspace/useWorkspace'

/** A link node's droppable data */
type LinkData = { zone: 'link'; objectId: string; dropKey: string }

/** The 'link' zone: a note dropped on a target's node gets linked to it (it falls into the node) */
export const linkZone: ZoneHandler = {
  target: (e, item) => {
    const data = e.over?.data.current as LinkData | undefined
    if (!data || !isNoteLike(item?.kind) || !item?.objectId || !canLink(item.objectId, data.objectId)) return null
    return { key: data.dropKey, objectId: data.objectId }
  },
  drop: (raw, target, float) => {
    const note = objectOf(raw)
    const { key, objectId } = target as DropTargetValue & { objectId: string }
    if (!note?.objectId) return
    fallInto(float, key, { lifted: true })
    linkNote(note.objectId, objectId)
  },
}

/**
 * The props of a link node for `objectId` at one place (e.g. 'sidebar', 'pin', 'dashboard'): shown while
 * a note is dragged (not onto itself), faint while the Notes page is on screen, else hidden
 */
export function useLinkNode() {
  const { item, target } = useObjectDrop()
  const { isOpen } = useWorkspace()
  const notesOnScreen = isOpen({ type: 'notes' })

  return (objectId: string, place: string, name: string) => {
    const dropKey = `link:${place}:${objectId}`
    const noteDragged = isNoteLike(item?.kind) && item?.objectId !== objectId
    return {
      id: dropKey,
      dropKey,
      data: { zone: 'link', objectId, dropKey } satisfies LinkData,
      icon: LuLink,
      label: `Link to ${name}`,
      state: noteDragged ? ('shown' as const) : notesOnScreen ? ('faint' as const) : ('hidden' as const),
      active: target?.zone === 'link' && target.value.key === dropKey,
    }
  }
}
