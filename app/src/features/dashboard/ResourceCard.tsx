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
import { LuGlobe, LuMaximize2, LuPlus } from 'react-icons/lu'
import Button from '../../components/ui/buttons/Button'
import IconButton from '../../components/ui/buttons/IconButton'
import Modal from '../../components/ui/overlays/Modal'
import type { Entry } from '../../lib/resource/reorder'
import CardFace from './cards/cardFaces'
import { ON_HOVER } from './cards/cardStyles'
import { BOOK_FRAME, BOOK_H, BOOK_INNER, BOOK_W } from './cards/book'
import MapPreview from './cards/MapPreview'

/** A map card's zoom and ⋯: the same square, so they line up and their hover backgrounds are the same shape */
const CARD_BUTTON = 'flex size-8 shrink-0'
/** A book's ⋯: in its picture's top right corner, right in the corner inside the picture's outline (book.ts BOOK_FRAME) */
const ON_PICTURE = {
  right: `${((BOOK_W - (BOOK_FRAME.x + BOOK_FRAME.w - 1)) / BOOK_W) * 100}%`,
  top: `${((BOOK_FRAME.y + 1) / BOOK_H) * 100}%`,
} as const
/** A book's Open: at the bottom inside the cover's border (book.ts BOOK_INNER), a pixel of the drawing from its line, centred across the border */
const ON_COVER = {
  left: `${((BOOK_INNER.left + BOOK_INNER.right + 1) / 2 / BOOK_W) * 100}%`,
  bottom: `${((BOOK_H - (BOOK_INNER.bottom - 1)) / BOOK_H) * 100}%`,
} as const

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
    // A book's sits in its picture's top right corner (and lifts with the book on hover); the others' in the card's
    <div
      onClick={(e) => e.stopPropagation()}
      // (a book's always shows, half see-through until the pointer is on it; the others' only on hover)
      className={`absolute flex ${look === 'image' ? 'opacity-50 transition-[translate,opacity] duration-200 ease-out group-hover/card:-translate-y-[3px] hover:opacity-100 has-[:popover-open]:opacity-100 motion-reduce:transition-none' : `end-2 top-2 ${ON_HOVER}`}`}
      style={look === 'image' ? ON_PICTURE : undefined}
    >
      {look === 'map' && (
        <span className={CARD_BUTTON}>
          <IconButton icon={LuMaximize2} label={`Zoom ${title}`} onClick={() => setZoomed(true)} className="size-full! min-h-0!" />
        </span>
      )}
      {addMenu && addMenu.length > 0 && <IconMenu label={`Add to ${title}`} icon={LuPlus} groups={addMenu} />}
      {look === 'map' || look === 'image' ? (
        // a book's: a dark square on its picture, edged in the brass of its corners
        <span className={`${CARD_BUTTON} ${look === 'image' ? 'bg-[#4a3a2e] text-[#e6dbc4] shadow-[inset_0_0_0_2px_#a17b2f]' : ''}`}>
          <TreeMenu label={`More: ${title}`} groups={menu} fill />
        </span>
      ) : (
        <TreeMenu label={`More: ${title}`} groups={menu} />
      )}
    </div>
  )
  // A book's Open: a leather button (the leather variant) on its cover, centred at its bottom (opens it, as a click on the card does)
  const open = look === 'image' && (
    <div
      onClick={(e) => e.stopPropagation()}
      className="absolute flex -translate-x-1/2 transition-transform duration-200 ease-out group-hover/card:-translate-y-[3px] motion-reduce:transition-none"
      style={ON_COVER}
    >
      <Button variant="leather" onClick={onOpen}>
        Open
      </Button>
    </div>
  )
  // Public (its owner's own card): anyone signed in can find it on Explore (docs/plans/41)
  const publicTag = item.visibility === 'public' && (
    <span
      title="Public: anyone signed in can find and read it"
      aria-label="Public"
      className="pointer-events-none absolute start-2 bottom-2 z-10 inline-flex size-6 items-center justify-center rounded-full bg-black/55 text-white/85"
    >
      <LuGlobe aria-hidden className="size-3.5" />
    </span>
  )
  const marks = (
    <>
      {open}
      {more}
      {publicTag}
      {bar}
    </>
  )

  const face = <CardFace resource={resource} item={item} title={title} contents={contents} dropping={dropping} pending={pending} box={card} className={box} marks={marks} />
  if (look !== 'map') return face
  return (
    <>
      {face}
      <Modal open={zoomed} onClose={() => setZoomed(false)} title={title} size="lg">
        <MapPreview id={id} className="aspect-video w-full rounded-(--btn-radius)" />
      </Modal>
    </>
  )
}
