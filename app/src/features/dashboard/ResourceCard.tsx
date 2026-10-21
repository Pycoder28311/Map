import type { TreeMenuGroup } from '../../components/ui/tree/types'
import TreeMenu from '../../components/ui/tree/TreeMenu'
import type { AnyResource } from '../../resources/types'
import { useDroppable } from '@dnd-kit/core'
import { useObjectDrag } from '../drag/objectDrag'
import { useObjectDrop } from '../drag/objectDrop'
import { PLACE_ZONE, placeDropData, type PlaceTarget, type PlaceValue } from '../drag/placeDrop'
import { useState } from 'react'
import { LuMaximize2 } from 'react-icons/lu'
import IconButton from '../../components/ui/buttons/IconButton'
import Modal from '../../components/ui/overlays/Modal'
import { placeholderArt } from '../objects/placeholderArt'
import { CARD_SIZE, COMMENT_SIZE, cardOf } from './cards/cardStyles'
import MapPreview from './cards/MapPreview'

const DATE = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' })
// Shown on hover or keyboard focus, and while its menu is open
const ON_HOVER = 'opacity-0 transition-opacity group-hover/card:opacity-100 group-focus-within/card:opacity-100 has-[:popover-open]:opacity-100'

type Props = {
  resource: AnyResource
  item: Record<string, unknown> & { id: number | string; createdAt?: string }
  /** The ⋯ menu's groups (useResourceMenu().menuOf) */
  menu: TreeMenuGroup[]
  onOpen: () => void
  /** Its place in its row: a drop on its left half goes before it, on its right half after it (none: no drops) */
  place?: PlaceTarget
}

/**
 * An item of a resource as a Dashboard card, in its resource's look (ui.card): `plain`, like a comment: a wide paper card, its title and date on top, its preview quoted below
 * behind a thin bar, fading out where it's cut; `image`, a picture on top (a placeholder made from its id: the list has no images), its
 * title, date and two lines; `map`, its preview filling the card, its title at the bottom and a zoom button. Drags like every card (onto
 * pane edges, the Trash…), opens on a click, ⋯ menu on hover.
 */
export default function ResourceCard({ resource, item, menu, onOpen, place }: Props) {
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
  const { setNodeRef: setDropRef } = useDroppable({ id: `dash-card-drop:${resource.name}:${id}`, data: place && placeDropData(place), disabled: !place })
  // Where a drop would land by it: a bar along its left (before) or right (after) edge, inside it (the card clips what sticks out)
  const { target } = useObjectDrop()
  const value = target?.zone === PLACE_ZONE ? (target.value as unknown as PlaceValue) : null
  const side = value?.mark === `${resource.name}:${id}` ? value.side : null
  const bar = (side === 'before' || side === 'after') && (
    <span aria-hidden className={`pointer-events-none absolute inset-y-1 z-20 w-1 rounded-full bg-drop ${side === 'before' ? 'start-0.5' : 'end-0.5'}`} />
  )
  const { role: _role, ...dragAttributes } = attributes
  const created = item.createdAt ? new Date(item.createdAt) : null
  const look = resource.ui.card ?? 'plain'
  const [zoomed, setZoomed] = useState(false)
  const box = `cursor-grab active:cursor-grabbing transition-[box-shadow,opacity] ${isDragging ? 'opacity-40' : ''}`
  const ref = (element: HTMLDivElement | null) => {
    setNodeRef(element)
    setDropRef(element)
  }
  const card = { ref, ...listeners, ...dragAttributes, 'data-card-id': id, 'data-card-kind': resource.panelType, onClick: onOpen }
  const more = (
    // Its own button: clicking it doesn't open the card
    <div onClick={(e) => e.stopPropagation()} className={`absolute end-2 top-2 flex rounded-(--btn-close-radius) bg-surface/80 ${ON_HOVER}`}>
      {look === 'map' && <IconButton icon={LuMaximize2} label={`Zoom ${title}`} onClick={() => setZoomed(true)} />}
      <TreeMenu label={`More: ${title}`} groups={menu} />
    </div>
  )
  const marks = (
    <>
      {more}
      {bar}
    </>
  )

  if (look === 'map') {
    return (
      <>
        <div {...card} className={`${cardOf(CARD_SIZE, false)} bg-surface ${box}`}>
          <MapPreview id={id} className="min-h-0 flex-1" />
          <span className="flex min-w-0 items-center gap-1.5 p-2 text-body font-medium">
            <Icon className="size-3.5 shrink-0 text-fg-subtle" />
            <span className="min-w-0 truncate">{title}</span>
          </span>
          {marks}
        </div>
        <Modal open={zoomed} onClose={() => setZoomed(false)} title={title} size="lg">
          <MapPreview id={id} pin="size-16" className="aspect-video w-full rounded-(--btn-radius)" />
        </Modal>
      </>
    )
  }

  if (look === 'image') {
    return (
      <div {...card} className={`${cardOf(CARD_SIZE)} bg-surface ${box}`}>
        <div style={placeholderArt(`${resource.panelType}${id}`)} className="h-24 shrink-0 rounded-(--btn-radius)" />
        <div className="flex items-center justify-between gap-2 px-0.5">
          <span className="flex min-w-0 items-center gap-1.5 text-body font-medium">
            <Icon className="size-3.5 shrink-0 text-fg-subtle" />
            <span className="min-w-0 truncate">{title}</span>
          </span>
          {created && <span className="shrink-0 text-small text-fg-subtle">{DATE.format(created)}</span>}
        </div>
        <p className="line-clamp-2 px-0.5 text-small text-fg-muted">{resource.ui.row.subtitle?.(item) || 'Empty'}</p>
        {marks}
      </div>
    )
  }

  return (
    <div {...card} className={`${cardOf(COMMENT_SIZE)} bg-note ${box}`}>
      <div className="flex items-center gap-2 px-0.5 pe-8 pt-0.5">
        <span className="flex min-w-0 items-center gap-1.5 text-body font-medium">
          <Icon className="size-3.5 shrink-0 text-fg-subtle" />
          <span className="min-w-0 truncate">{title}</span>
        </span>
        {created && <span className="shrink-0 text-small text-fg-subtle">{DATE.format(created)}</span>}
      </div>
      <p className="line-clamp-4 border-s-2 border-fg/20 ps-2 text-body text-fg-muted [mask-image:linear-gradient(to_bottom,black_65%,transparent)]">
        {resource.ui.row.subtitle?.(item) || 'Empty'}
      </p>
      {marks}
    </div>
  )
}
