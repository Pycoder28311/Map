import { useDroppable } from '@dnd-kit/core'
import { useState } from 'react'
import { useLayoutsState } from '../../../mocks/layoutsStore'
import { useTrashedItems } from '../../../lib/resource/trash'
import { resourcesWith } from '../../../resources/registry'
import { TREE_ROW_LOOK, buttonClass } from '../../ui/buttons/buttonStyles'
import { useLidOpen } from '../../ui/tree/swallow'
import { TRASH_ID, useSidebarDrop } from './sidebarDropState'
import TrashModal from './TrashModal'

// Full class strings so Tailwind can detect them at build time.
// Closed sidebar: as wide as a rail row (its icon's box + the row padding), so its hover/drop look fits
const RAIL_ROW = 'max-w-[calc(2*var(--btn-px)+var(--btn-icon-size)+2*var(--btn-close-p))]'
// The lid swings open around its left hinge (where the lid line starts: 3,6 in the 24×24 icon)
const LID =
  '[transform-box:view-box] origin-[3px_6px] transition-[rotate] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none'

/** Lucide's trash-2, with the lid (its line and handle) as a group of its own, so it can open */
function TrashIcon({ open }: { open: boolean }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-(--btn-icon-size) overflow-visible"
    >
      <g className={`${LID} ${open ? '-rotate-[28deg]' : ''}`}>
        <path d="M3 6h18" />
        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
      </g>
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <line x1="10" x2="10" y1="11" y2="17" />
      <line x1="14" x2="14" y1="11" y2="17" />
    </svg>
  )
}

const RESOURCES_IN_TRASH = resourcesWith('trash')

/**
 * The trash bin at the bottom of the sidebar: drop an object on it to archive it (it falls in, the
 * lid opens). Click: what's in it, to restore or delete for good.
 */
export default function TrashBin({ compact }: { compact: boolean }) {
  const { setNodeRef } = useDroppable({ id: TRASH_ID, data: { zone: 'trash', priority: 2 } })
  const { target } = useSidebarDrop()
  const over = target?.kind === 'trash'
  const swallowing = useLidOpen(TRASH_ID)
  const [open, setOpen] = useState(false)
  // The Trash holds saved layouts and the archived items of every resource that shows in it (asked only while the Trash is open,
  // so the button's count leaves them out)
  const trashed = useTrashedItems(RESOURCES_IN_TRASH, open)
  const count = useLayoutsState().layouts.filter((l) => l.archived).length

  return (
    <>
      <button
        ref={setNodeRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Trash, ${count} ${count === 1 ? 'item' : 'items'}`}
        title="Trash"
        className={buttonClass(
          'ghost',
          true,
          `relative w-full justify-start text-fg-muted transition-[max-width] duration-(--sidebar-duration) ${compact ? RAIL_ROW : 'max-w-full'} ${over ? 'bg-drop/16 ring-[1.4px] ring-inset ring-drop/55' : TREE_ROW_LOOK}`,
        )}
      >
        <span data-drop-icon={TRASH_ID} className="ms-(--btn-icon-offset-start) flex shrink-0">
          <TrashIcon open={over || swallowing} />
        </span>
        {/* Closed sidebar: only the icon (the label fades out and takes no space) */}
        <span
          className={`overflow-hidden whitespace-nowrap transition-[max-width,opacity] duration-(--sidebar-duration) ease-out motion-reduce:transition-none ${
            compact ? 'max-w-0 opacity-0' : 'max-w-24'
          }`}
        >
          Trash
        </span>
        {count > 0 && (
          // Compact: a badge on the icon; open: at the row's end
          <span
            className={`rounded-(--radius-pill) bg-fill-strong px-1.5 text-small leading-4 text-fg transition-[inset] duration-(--sidebar-duration) ${
              compact ? 'absolute start-[calc(var(--btn-px)+var(--btn-icon-size))] top-0.5' : 'ms-auto'
            }`}
          >
            {count}
          </span>
        )}
      </button>
      {open && <TrashModal trashed={trashed} onClose={() => setOpen(false)} />}
    </>
  )
}
