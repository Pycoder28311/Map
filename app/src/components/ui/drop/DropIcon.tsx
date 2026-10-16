import { useDroppable } from '@dnd-kit/core'
import type { PlainIcon } from '../icons/IconSlot'
import { useLidOpen } from '../tree/swallow'

// Full class strings so Tailwind can detect them at build time.
const STATE = {
  // Slid out of sight to the right (its row's edge)
  hidden: 'pointer-events-none translate-x-full opacity-0',
  // A hint (e.g. on the Notes page): there, but not taking drops
  faint: 'pointer-events-none opacity-30',
  shown: '',
} as const
const SIZE = {
  // As tall as the row it's on
  row: 'h-full aspect-square',
  small: 'size-6',
} as const
// Targeted, or something is falling in: it grows and fills with the drop colour
const ACTIVE = 'scale-110 border-drop bg-drop text-white'

type Props = {
  /** The droppable's id (unique) */
  id: string
  /** Its drop key: where the fall-into effect lands (fallInto) and whose lid opens */
  dropKey: string
  /** The droppable's data, e.g. { zone: 'link', objectId } (priority 3 unless given) */
  data: Record<string, unknown>
  icon: PlainIcon
  label: string
  state: keyof typeof STATE
  /** The current drag would land here */
  active?: boolean
  size?: keyof typeof SIZE
  className?: string
  /** Makes it a button too (e.g. picking a link target by a click); `active` then shows whether it is on */
  onPick?: () => void
}

/**
 * A round drop target with an icon (e.g. a link node next to a sidebar row): takes drops while
 * shown, grows when targeted, and is where a dropped object falls in (data-drop-icon). Place it with
 * `className` (e.g. absolute at a row's end).
 */
export default function DropIcon({ id, dropKey, data, icon: Icon, label, state, active = false, size = 'row', className = '', onPick }: Props) {
  const { setNodeRef } = useDroppable({ id, data: { priority: 3, ...data }, disabled: state !== 'shown' })
  const lidOpen = useLidOpen(dropKey)
  return (
    <span
      ref={setNodeRef}
      role={onPick ? 'button' : 'img'}
      aria-label={label}
      aria-pressed={onPick ? active : undefined}
      aria-hidden={state === 'hidden'}
      tabIndex={onPick && state === 'shown' ? 0 : undefined}
      // On a row: the click is the node's own, never the row's (which would open the page)
      onClick={onPick && ((e) => { e.preventDefault(); e.stopPropagation(); onPick() })}
      onPointerDown={onPick && ((e) => e.stopPropagation())}
      onKeyDown={onPick && ((e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); onPick() } })}
      data-drop-icon={dropKey}
      className={`flex items-center justify-center rounded-(--radius-pill) border border-line-strong bg-surface text-fg shadow-sm transition-[translate,opacity,scale,background-color,border-color,color] duration-200 ease-out motion-reduce:transition-none ${SIZE[size]} ${STATE[state]} ${active || lidOpen ? ACTIVE : ''} ${onPick ? 'cursor-pointer' : ''} ${className}`}
    >
      <Icon className="size-(--btn-icon-size)" />
    </span>
  )
}
