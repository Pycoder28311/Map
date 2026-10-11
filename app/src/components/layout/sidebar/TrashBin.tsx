import { useDroppable } from '@dnd-kit/core'
import { useState } from 'react'
import { useLayoutsState } from '../../../mocks/layoutsStore'
import { useMockObjects } from '../../../mocks/projectsStore'
import { buttonClass } from '../../ui/buttons/buttonStyles'
import { useLidOpen } from '../../ui/tree/swallow'
import { TRASH_ID, useSidebarDrop } from './sidebarDropState'
import TrashModal from './TrashModal'

// Full class strings so Tailwind can detect them at build time.
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

/**
 * The trash bin at the bottom of the sidebar: drop an object on it to archive it (it falls in, the
 * lid opens). Click: what's in it, to restore or delete for good.
 */
export default function TrashBin({ compact }: { compact: boolean }) {
  const { setNodeRef } = useDroppable({ id: TRASH_ID })
  const { target } = useSidebarDrop()
  const over = target?.kind === 'trash'
  const swallowing = useLidOpen(TRASH_ID)
  const count = useMockObjects().filter((o) => o.archived).length + useLayoutsState().layouts.filter((l) => l.archived).length
  const [open, setOpen] = useState(false)

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
          `relative w-full justify-start text-fg-muted ${over ? 'bg-drop/16 ring-[1.4px] ring-inset ring-drop/55' : ''}`,
        )}
      >
        <span data-trash-icon className="ms-(--btn-icon-offset-start) flex shrink-0">
          <TrashIcon open={over || swallowing} />
        </span>
        <span className="whitespace-nowrap">Trash</span>
        {count > 0 && (
          // Compact: a badge on the icon; open: at the row's end
          <span
            className={`rounded-full bg-fill-strong px-1.5 text-small leading-4 text-fg transition-[inset] duration-(--sidebar-duration) ${
              compact ? 'absolute start-[calc(var(--btn-px)+var(--btn-icon-size))] top-0.5' : 'ms-auto'
            }`}
          >
            {count}
          </span>
        )}
      </button>
      {open && <TrashModal onClose={() => setOpen(false)} />}
    </>
  )
}
