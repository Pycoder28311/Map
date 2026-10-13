import { useDroppable } from '@dnd-kit/core'
import { useCallback, useState, type ReactNode } from 'react'
import { LuHeart } from 'react-icons/lu'
import DropIcon from '../../../components/ui/drop/DropIcon'
import TreeMenu from '../../../components/ui/tree/TreeMenu'
import type { TreeMenuGroup } from '../../../components/ui/tree/types'
import type { MockObject } from '../../../mocks/projects'
import { isLinkTarget, renameObject, toggleLike } from '../../../mocks/projectsStore'
import { KIND_ICON } from '../../../mocks/sidebarTree'
import { useObjectDrag } from '../../drag/objectDrag'
import type { useLinkNode } from '../../links/linkNode'

// Full class strings so Tailwind can detect them at build time.
// Every card in a row the same size, so it lines up (each kind arranges its own content inside)
const CARD_BASE =
  'group/card relative flex shrink-0 snap-start flex-col gap-2 overflow-hidden rounded-(--card-radius) p-2 text-start shadow-sm ring-1 ring-line'
/** The usual card size, and the Notes row's wider, shorter comment cards */
export const CARD_SIZE = 'h-52 w-44'
export const COMMENT_SIZE = 'h-40 w-72'
export const CARD = `${CARD_BASE} ${CARD_SIZE}`
/** A card of a given size (for the empty state and the drop gap of a row) */
export const cardOf = (size: string) => `${CARD_BASE} ${size}`
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

type SizeProp = { size?: string }

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
export default function CardShell({ object, menu, onOpen, linkNodeFor, dropActive, renameOnMount, size = CARD_SIZE, className = 'bg-surface', children }: ShellProps) {
  const Icon = KIND_ICON[object.kind]
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
      className="w-full min-w-0 rounded-(--corner-sm) bg-surface px-1 text-body font-medium text-fg outline-2 outline-accent"
    />
  ) : (
    <span className="min-w-0 truncate text-body font-medium">{object.name}</span>
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
      className={`${cardOf(size)} ${className} cursor-grab active:cursor-grabbing transition-[box-shadow,opacity] ${
        dropActive || link?.active ? 'ring-2 ring-drop' : ''
      } ${isDragging ? 'opacity-40' : ''}`}
    >
      {children(name)}

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
        className="absolute end-2 bottom-2 inline-flex cursor-pointer items-center gap-1 rounded-full bg-surface/80 px-1.5 py-0.5 text-small text-fg-muted hover:text-fg"
      >
        <LuHeart className={`size-3.5 ${object.liked ? 'fill-danger text-danger' : ''}`} />
        {object.likes}
      </button>
      {link && <DropIcon {...link} size="small" className="absolute start-2 top-2" />}
    </div>
  )
}
