import { useDroppable } from '@dnd-kit/core'
import { useCallback, useState, type ReactNode } from 'react'
import { LuMaximize2, LuSquare, LuSquareCheck } from 'react-icons/lu'
import DropIcon from '../../../components/ui/drop/DropIcon'
import IconButton from '../../../components/ui/buttons/IconButton'
import TreeMenu from '../../../components/ui/tree/TreeMenu'
import type { TreeMenuGroup } from '../../../components/ui/tree/types'
import type { MockObject } from '../../../mocks/projects'
import { isLinkTarget, renameObject } from '../../../mocks/projectsStore'
import { KIND_ICON } from '../../../mocks/sidebarTree'
import { useObjectDrag } from '../../drag/objectDrag'
import type { useLinkNode } from '../../links/linkNode'
import { toggleSelected, useSelected } from '../../select/selectStore'
import Button from '../../../components/ui/buttons/Button'

// Full class strings so Tailwind can detect them at build time.
// Every card in a row the same size, so it lines up (each kind arranges its own content inside)
const CARD_BASE =
  'group/card relative flex shrink-0 snap-start flex-col overflow-hidden rounded-(--card-radius) text-start shadow-sm ring-1 ring-line'
const PADDED = 'gap-2 p-2'
/** The usual card size, and the Notes row's wider, shorter comment cards */
export const CARD_SIZE = 'h-52 w-44'
export const COMMENT_SIZE = 'h-40 w-72'
export const CARD = `${CARD_BASE} ${PADDED} ${CARD_SIZE}`
/** A card of a given size (for the empty state and the drop gap of a row) */
export const cardOf = (size: string, padded = true) => `${CARD_BASE} ${padded ? PADDED : ''} ${size}`
// Shown on hover or keyboard focus, and while its menu is open
const ON_HOVER = 'opacity-0 transition-opacity group-hover/card:opacity-100 group-focus-within/card:opacity-100 has-[:popover-open]:opacity-100'

export type CardProps = {
  object: MockObject
  /** Its ⋯ menu (useObjectActions; Rename calls onRename) */
  menu: (onRename: () => void) => TreeMenuGroup[]
  onOpen: () => void
  linkNodeFor: ReturnType<typeof useLinkNode>
  /** A dragged article would fall into it (a folder card) */
  dropActive?: boolean
  /** Starts with its name being edited (just created) */
  renameOnMount?: boolean
  /** Just created and not confirmed yet: Cancel / Create buttons show along its bottom */
  pending?: { onCancel: () => void; onCreate: () => void }
}

// The folded corner: the card's top-right corner is cut off along a diagonal (CORNER px each way) and its tip floats
// a little way off (a gap of 2 × GAP px, measured across the corner), as a small triangle in the card's own background. Drawn as a clip
// of the card (the ring is inset, as the clip would cut an outer one) plus lines along the two diagonal edges
const CORNER = 16
const GAP = 1.5
const TIP = CORNER - 2 * GAP
const CORNER_CLIP = `polygon(0 0, calc(100% - ${TIP}px) 0, 100% 0, 100% ${TIP}px, calc(100% - ${TIP}px) 0, calc(100% - ${CORNER}px) 0, 100% ${CORNER}px, 100% 100%, 0 100%)`
// Along the corner square's diagonal direction: the floating tip, then the gap, then the card; 1.4px ≈ a 1px line, in the card's ring colour (--tw-ring-color)
const TIP_STOP = `${((TIP / (2 * CORNER)) * 100).toFixed(2)}%`
const CORNER_EDGES = `linear-gradient(to bottom left, transparent 0 calc(${TIP_STOP} - 1.4px), var(--tw-ring-color) calc(${TIP_STOP} - 1.4px) ${TIP_STOP}, transparent ${TIP_STOP} 50%, var(--tw-ring-color) 50% calc(50% + 1.4px), transparent calc(50% + 1.4px))`

type SizeProp = {
  size?: string
  /** The folded top-right corner (see CORNER above): articles and objects */
  corner?: boolean
  /**
   * 'media': the content is a picture filling the card; the name sits over it at the bottom, and on hover
   * a dim layer shows Open, a select checkbox and the buttons (zoom, ⋯)
   */
  variant?: 'media'
  /** media: its zoom button (the picture, larger) */
  onZoom?: () => void
}

type ShellProps = CardProps & SizeProp & {
  /** The card's background (e.g. a note's paper); default: the surface */
  className?: string
  /** Its content; `name`: the name, or its input while renaming */
  children: (name: ReactNode) => ReactNode
}

/**
 * What every Dashboard card shares: its size, the drag (anywhere objects go: rows, folders, the
 * sidebar, panes, link nodes, the trash), click to open, the ⋯ menu (the sidebar's actions), renaming
 * in place, a link node for what notes link to, and the marks for share mode and row drops.
 */
export default function CardShell({ object, menu, onOpen, linkNodeFor, dropActive, renameOnMount, pending, size = CARD_SIZE, variant, onZoom, corner, className = 'bg-surface', children }: ShellProps) {
  const Icon = KIND_ICON[object.kind]
  const media = variant === 'media'
  const selected = useSelected(object.id)
  const [renaming, setRenaming] = useState(!!renameOnMount)
  const { setNodeRef, listeners, attributes, isDragging } = useObjectDrag({
    id: `dash-card:${object.id}`,
    label: object.name,
    panel: { type: object.kind, id: object.id },
    object: { objectId: object.id, kind: object.kind, icon: Icon, source: 'pane' },
    disabled: renaming,
  })
  const { role: _role, ...dragAttributes } = attributes
  const link = isLinkTarget(object.kind) ? linkNodeFor(object.id, 'dash-card', object.name) : undefined
  // The whole card takes the note too (the node shows where it falls in)
  const { setNodeRef: setDropRef } = useDroppable({
    id: `${link?.dropKey ?? `dash-card:${object.id}`}:card`,
    data: link?.data,
    disabled: !link || link.state !== 'shown',
  })
  const setRef = useCallback(
    (el: HTMLElement | null) => {
      setNodeRef(el)
      setDropRef(el)
    },
    [setNodeRef, setDropRef],
  )

  const name = renaming ? (
    <input
      defaultValue={object.name}
      aria-label="Name"
      autoFocus
      onFocus={(e) => e.currentTarget.select()}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur()
        if (e.key === 'Escape') {
          e.currentTarget.value = object.name
          e.currentTarget.blur()
        }
      }}
      onBlur={(e) => {
        const next = e.currentTarget.value.trim()
        if (next && next !== object.name) renameObject(object.id, next)
        setRenaming(false)
      }}
      className={`w-full min-w-0 rounded-(--corner-sm) bg-surface px-1 text-body font-medium text-fg outline-2 outline-accent ${media ? 'text-center' : ''}`}
    />
  ) : (
    <span className={`min-w-0 truncate text-body font-medium ${media ? 'block text-center' : ''}`}>{object.name}</span>
  )

  return (
    <div
      ref={setRef}
      {...listeners}
      {...dragAttributes}
      data-share-id={object.id}
      data-card-id={object.id}
      data-card-kind={object.kind}
      data-pending={pending ? '' : undefined}
      onClick={renaming ? undefined : onOpen}
      style={corner ? { clipPath: CORNER_CLIP } : undefined}
      className={`${cardOf(size, !media)} ${corner ? 'ring-inset' : ''} ${className} cursor-grab active:cursor-grabbing transition-[box-shadow,opacity] ${
        dropActive || link?.active ? 'ring-2 ring-drop' : selected ? 'ring-2 ring-accent' : ''
      } ${isDragging ? 'opacity-40' : ''}`}
    >
      {children(name)}

      {media ? (
        <>
          {/* Over the picture: the dim layer + Open (on hover), the name (always) */}
          <div aria-hidden="true" className={`pointer-events-none absolute inset-0 grid place-items-center bg-black/35 text-body font-medium text-white ${ON_HOVER}`}>
            Open
          </div>
          <div className={`pointer-events-none absolute inset-x-0 ${pending ? 'bottom-14' : 'bottom-0'} bg-linear-to-t from-black/65 to-transparent px-3 pt-8 pb-2 text-white ${renaming ? 'pointer-events-auto' : ''}`}>
            {name}
          </div>
          {/* Their own buttons: clicking them doesn't open the card (and, being buttons, don't start a drag) */}
          <div onClick={(e) => e.stopPropagation()} className={`absolute start-2 top-2 ${selected ? '' : ON_HOVER}`}>
            <button
              type="button"
              role="checkbox"
              aria-checked={selected}
              aria-label={`Select ${object.name}`}
              onClick={() => toggleSelected(object.id)}
              className="inline-flex cursor-pointer rounded-(--corner-sm) bg-surface/80 p-1 text-fg hover:bg-surface"
            >
              {selected ? <LuSquareCheck className="size-4 text-accent" /> : <LuSquare className="size-4" />}
            </button>
          </div>
          <div onClick={(e) => e.stopPropagation()} className={`absolute end-2 top-2 flex items-center gap-1 ${ON_HOVER}`}>
            <span className="rounded-(--btn-close-radius) bg-surface/80">
              <IconButton icon={LuMaximize2} label={`View image: ${object.name}`} onClick={onZoom} />
            </span>
            <span className="rounded-(--btn-close-radius) bg-surface/80">
              <TreeMenu label={`More: ${object.name}`} groups={menu(() => setRenaming(true))} />
            </span>
          </div>
        </>
      ) : (
      <>
      {/* Its own buttons: clicking them doesn't open the card */}
      <div onClick={(e) => e.stopPropagation()} className={`absolute top-2 rounded-(--btn-close-radius) bg-surface/80 end-2 ${ON_HOVER}`}>
        <TreeMenu label={`More: ${object.name}`} groups={menu(() => setRenaming(true))} />
      </div>
      </>
      )}
      {pending && (
        // Its own buttons, in the card's flow right under what the card shows (its name input stays uncovered); over a
        // picture (maps) along the bottom, with the name lifted above. Clicking them neither opens the card nor drags it
        <div
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          className={`flex gap-2 ${media ? 'absolute inset-x-0 bottom-0 bg-surface p-2' : 'mt-auto'}`}
        >
          <Button variant="ghost" onClick={pending.onCancel} className="flex-1 justify-center">
            Cancel
          </Button>
          <Button onClick={pending.onCreate} className="flex-1 justify-center [box-shadow:none]! hover:[box-shadow:none]!">
            Create
          </Button>
        </div>
      )}
      {corner && (
        <div
          aria-hidden
          style={{ width: CORNER, height: CORNER, backgroundImage: CORNER_EDGES }}
          className="pointer-events-none absolute end-0 top-0"
        />
      )}
      {link && <DropIcon {...link} size="small" className={`absolute start-2 ${media ? 'bottom-2' : 'top-2'}`} />}
    </div>
  )
}
