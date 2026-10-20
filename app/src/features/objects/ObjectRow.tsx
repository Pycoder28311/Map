import type { ReactNode } from 'react'
import { LuLink } from 'react-icons/lu'
import type { ButtonIcon } from '../../components/ui/icons/IconSlot'
import { useObjectDrag } from '../drag/objectDrag'
import type { PanelRef } from '../workspace/types'

// Full class strings so Tailwind can detect them at build time.
const ROW = 'flex items-center gap-2 rounded-(--card-radius) bg-fill px-3 py-2 text-body'
// A line in a plain list (the Dashboard's columns): no fill, a background on hover (not while
// something is being dragged: <html data-dragging>, WorkspaceProvider). A fixed height (as tall as
// a row with a link node's 24px circle), so every row is the same, with or without one
export const PLAIN_ROW =
  'flex h-10 items-center gap-2 rounded-(--btn-radius) px-2 text-body [html:not([data-dragging])_&:hover]:bg-fill'

type Props = {
  /** The object it shows */
  object: { id: string; kind: string; name: string }
  icon: ButtonIcon
  /** Unique among draggables (e.g. "notes-list:n1") */
  dragId: string
  /** Its panel: dropped on a pane's edge, it opens there */
  panel?: PanelRef
  /** Small text after the name (e.g. its project) */
  hint?: string
  /** How many objects it's linked to */
  links?: number
  /** At its end (e.g. open-as-panel, a link node) */
  end?: ReactNode
  /** card: a filled row (Notes page); plain: a line in a list (Dashboard columns) */
  variant?: 'card' | 'plain'
  /** Click: open it (e.g. navigate to its page) */
  onOpen?: () => void
  className?: string
}

/**
 * One object as a row in a pane's list (the Notes page, a Dashboard card…), draggable anywhere: onto
 * sidebar rows, link nodes, the trash, pane edges (features/drag). Dragged by its background (its
 * buttons keep the pointer); its place stays faint while it's dragged.
 */
export default function ObjectRow({ object, icon: Icon, dragId, panel, hint, links, end, variant = 'card', onOpen, className = '' }: Props) {
  const { setNodeRef, listeners, attributes, isDragging } = useObjectDrag({
    id: dragId,
    label: object.name,
    panel,
    object: { objectId: object.id, kind: object.kind, icon: Icon, source: 'pane' },
  })
  const { role: _role, ...dragAttributes } = attributes
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...dragAttributes}
      data-share-id={`${object.kind}:${object.id}`}
      onClick={onOpen}
      className={`${variant === 'plain' ? PLAIN_ROW : ROW} cursor-grab active:cursor-grabbing ${isDragging ? 'opacity-40' : ''} ${className}`}
    >
      <Icon className="size-(--btn-icon-size) shrink-0 text-fg-subtle" />
      <span className="min-w-0 flex-1 truncate">
        {object.name}
        {hint && <span className="text-fg-subtle"> · {hint}</span>}
      </span>
      {!!links && (
        <span title={`${links} linked`} className="inline-flex shrink-0 items-center gap-0.5 text-small text-fg-subtle">
          <LuLink className="size-3" aria-hidden />
          {links}
        </span>
      )}
      {end}
    </div>
  )
}

/** How a dragged object looks over a list of ObjectRows (a drag surface's look) */
export function ObjectRowLook({ label, icon: Icon, className = 'w-72' }: { label: string; icon?: ButtonIcon; className?: string }) {
  return (
    <div className={`${ROW} ${className} bg-surface shadow-lg ring-1 ring-line`}>
      {Icon && <Icon className="size-(--btn-icon-size) shrink-0 text-fg-subtle" />}
      <span className="min-w-0 flex-1 truncate">{label}</span>
    </div>
  )
}
