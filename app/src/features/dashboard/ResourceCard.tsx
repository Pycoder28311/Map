import type { TreeMenuGroup } from '../../components/ui/tree/types'
import IconMenu from '../../components/ui/tree/IconMenu'
import TreeMenu from '../../components/ui/tree/TreeMenu'
import type { AnyResource } from '../../resources/types'
import { useDroppable } from '@dnd-kit/core'
import { useHeldKey } from '../drag/held'
import { useObjectDrag } from '../drag/objectDrag'
import { useObjectDrop } from '../drag/objectDrop'
import { PLACE_ZONE, placeDropData, type PlaceTarget, type PlaceValue } from '../drag/placeDrop'
import { useState } from 'react'
import { LuMaximize2, LuPlus } from 'react-icons/lu'
import IconButton from '../../components/ui/buttons/IconButton'
import Modal from '../../components/ui/overlays/Modal'
import type { Entry } from '../../lib/resource/reorder'
import CardFace from './cards/cardFaces'
import { ON_HOVER } from './cards/cardStyles'
import MapPreview from './cards/MapPreview'

type Props = {
  resource: AnyResource
  item: Record<string, unknown> & { id: number | string; createdAt?: string }
  /** The ⋯ menu's groups (useResourceMenu().menuOf) */
  menu: TreeMenuGroup[]
  onOpen: () => void
  /** Its place in its row: a drop on its left half goes before it, on its right half after it (none: no drops) */
  place?: PlaceTarget
  /** A folder's first items (its tiles) */
  contents?: Entry[]
  /** The + menu, next to the ⋯: what can be created inside it (a folder); none: no + */
  addMenu?: TreeMenuGroup[]
  /** A draft card is being made from this folder (its dashed tile shows) */
  pending?: boolean
}

/**
 * An item of a resource as a Dashboard card, in its resource's look (ui.card): `plain`, like a comment: a square paper card, its title and date on top, its preview quoted below
 * behind a thin bar, fading out where it's cut; `image`, a picture on top (a placeholder made from its id: the list has no images), its
 * title, date and two lines; `map`, its preview filling the card, its title in a narrower box hanging below it, centred on its bottom edge, and a zoom button. Drags like every card (onto
 * pane edges, the Trash…), opens on a click, ⋯ menu on hover.
 */
export default function ResourceCard({ resource, item, menu, onOpen, place, contents, addMenu, pending }: Props) {
  const id = String(item.id)
  const title = resource.ui.row.title(item)
  const Icon = resource.ui.icon
  const { setNodeRef, listeners, attributes, isDragging } = useObjectDrag({
    id: `dash-card:${resource.name}:${id}`,
    label: title,
    panel: resource.surfaces.panel ? { type: resource.panelType, id } : undefined,
    object: {
      objectId: id,
      kind: resource.panelType,
      icon: Icon,
      source: 'pane',
      parent: resource.parents?.length ? { type: (item.objectType as string | null | undefined) ?? null, id: (item.objectId as number | null | undefined) ?? null } : undefined,
      pinned: item.pinned === true,
    },
  })
  // Let go into a new parent, it stays faded until the dragged copy has fallen in
  const held = useHeldKey(`${resource.panelType}:${id}`)
  const { setNodeRef: setDropRef } = useDroppable({ id: `dash-card-drop:${resource.name}:${id}`, data: place && placeDropData(place), disabled: !place })
  // Where a drop would land by it: a bar along its left (before) or right (after) edge, inside it (the card clips what sticks out)
  const { target } = useObjectDrop()
  const value = target?.zone === PLACE_ZONE ? (target.value as unknown as PlaceValue) : null
  const side = value?.mark === `${resource.name}:${id}` ? value.side : null
  // A folder with an item over its middle: it shows where it would go (the dashed square)
  const dropping = value?.side === 'into' && value.mark === `${resource.name}:${id}`
  const bar = (side === 'before' || side === 'after') && (
    <span aria-hidden className={`pointer-events-none absolute inset-y-1 z-20 w-1 rounded-full bg-drop ${side === 'before' ? 'start-0.5' : 'end-0.5'}`} />
  )
  const { role: _role, ...dragAttributes } = attributes
  const look = resource.ui.card ?? 'plain'
  const [zoomed, setZoomed] = useState(false)
  const box = `cursor-grab active:cursor-grabbing transition-[box-shadow,opacity] ${isDragging || held ? 'opacity-40' : ''}`
  const ref = (element: HTMLDivElement | null) => {
    setNodeRef(element)
    setDropRef(element)
  }
  const card = { ref, ...listeners, ...dragAttributes, 'data-card-id': id, 'data-card-kind': resource.panelType, onClick: onOpen }
  const more = (
    // Its own button: clicking it doesn't open the card
    <div onClick={(e) => e.stopPropagation()} className={`absolute end-2 top-2 flex ${ON_HOVER}`}>
      {look === 'map' && <IconButton icon={LuMaximize2} label={`Zoom ${title}`} onClick={() => setZoomed(true)} />}
      {addMenu && addMenu.length > 0 && <IconMenu label={`Add to ${title}`} icon={LuPlus} groups={addMenu} />}
      <TreeMenu label={`More: ${title}`} groups={menu} />
    </div>
  )
  const marks = (
    <>
      {more}
      {bar}
    </>
  )

  const face = <CardFace resource={resource} item={item} title={title} contents={contents} dropping={dropping} pending={pending} box={card} className={box} marks={marks} />
  if (look !== 'map') return face
  return (
    <>
      {face}
      <Modal open={zoomed} onClose={() => setZoomed(false)} title={title} size="lg">
        <MapPreview id={id} pin="size-16" className="aspect-video w-full rounded-(--btn-radius)" />
      </Modal>
    </>
  )
}
