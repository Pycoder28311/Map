import { useDroppable } from '@dnd-kit/core'
import { useCallback, useState, type ReactNode } from 'react'
import { LuHeart, LuMaximize2, LuSquare, LuSquareCheck } from 'react-icons/lu'
import DropIcon from '../../../components/ui/drop/DropIcon'
import IconButton from '../../../components/ui/buttons/IconButton'
import TreeMenu from '../../../components/ui/tree/TreeMenu'
import type { TreeMenuGroup } from '../../../components/ui/tree/types'
import type { MockObject } from '../../../mocks/projects'
import { isLinkTarget, renameObject, toggleLike } from '../../../mocks/projectsStore'
import { KIND_ICON } from '../../../mocks/sidebarTree'
import { useObjectDrag } from '../../drag/objectDrag'
import type { useLinkNode } from '../../links/linkNode'
import { toggleSelected, useSelected } from '../../select/selectStore'
import { PILL_BUTTON } from '../../../components/ui/buttons/buttonStyles'

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
}

type SizeProp = {
  size?: string
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
 * in place, the ♡ likes, a link node for what notes link to, and the marks for share mode and row drops.
 */
export default function CardShell({ object, menu, onOpen, linkNodeFor, dropActive, renameOnMount, size = CARD_SIZE, variant, onZoom, className = 'bg-surface', children }: ShellProps) {
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
      onClick={renaming ? undefined : onOpen}
      className={`${cardOf(size, !media)} ${className} cursor-grab active:cursor-grabbing transition-[box-shadow,opacity] ${
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
          <div className={`pointer-events-none absolute inset-x-0 bottom-0 bg-linear-to-t from-black/65 to-transparent px-3 pt-8 pb-2 text-white ${renaming ? 'pointer-events-auto' : ''}`}>
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
      <div onClick={(e) => e.stopPropagation()} className={`absolute end-2 top-2 rounded-(--btn-close-radius) bg-surface/80 ${ON_HOVER}`}>
        <TreeMenu label={`More: ${object.name}`} groups={menu(() => setRenaming(true))} />
      </div>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          toggleLike(object.id)
        }}
        aria-pressed={!!object.liked}
        aria-label={object.liked ? 'Unlike' : 'Like'}
        className={`${PILL_BUTTON} absolute end-2 bottom-2 gap-1 bg-surface/80 px-1.5 py-0.5 text-small text-fg-muted hover:text-fg`}
      >
        <LuHeart className={`size-3.5 ${object.liked ? 'fill-danger text-danger' : ''}`} />
        {object.likes}
      </button>
      </>
      )}
      {link && <DropIcon {...link} size="small" className={`absolute start-2 ${media ? 'bottom-2' : 'top-2'}`} />}
    </div>
  )
}
