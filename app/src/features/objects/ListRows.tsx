// Plain lists of rows (the Dashboard's columns, the navbar's Recent History): the list with its lines
// and "Show all", an object's row (draggable, opens on click, takes note links), and a row for
// anything else (a page, a combination of panes, a saved layout).
import { useState, type ReactNode } from 'react'
import { LuChevronsDown, LuChevronsUp } from 'react-icons/lu'
import { Link, useNavigate } from 'react-router-dom'
import { resourceByPanelType } from '../../resources/registry'
import { useOptionalItemModal } from '../items/ItemModal'
import type { PlainIcon } from '../../components/ui/icons/IconSlot'
import type { WorkspaceLayout } from '../workspace/layout'
import { usePanelRegistry } from '../workspace/registryContext'
import { hrefFor } from '../workspace/useWorkspace'
import { PLAIN_ROW } from './ObjectRow'
import Button from '../../components/ui/buttons/Button'

/** Rows shown before "Show all" (the Dashboard's columns: three) */
const MAX_ROWS = 3

// Full class strings so Tailwind can detect them at build time.
// A line between rows; a hovered row hides the lines above and below it (not while dragging)
const LIST =
  'flex flex-col [html:not([data-dragging])_&>li:hover]:border-transparent [html:not([data-dragging])_&>li:hover+li]:border-transparent'

/**
 * Opens one panel on its own, or a combination (never added beside the current page). One item of a resource that opens in a modal
 * (surfaces.modal: a note) shows in the centred modal instead, wherever it is opened from (Recent, the columns, the search…)
 */
export function useOpenLayout() {
  const registry = usePanelRegistry()
  const navigate = useNavigate()
  const itemModal = useOptionalItemModal()
  return (layout: WorkspaceLayout) => {
    const only = layout.panels.length === 1 ? layout.panels[0] : undefined
    const resource = only?.id ? resourceByPanelType(only.type) : undefined
    if (itemModal && only?.id && resource?.surfaces.modal) itemModal.open(resource, only.id)
    else navigate(hrefFor(layout, registry))
  }
}

/**
 * The rows, the first `limit` (3 by default); more than that, "Show all" below them: it opens the rest
 * in place (and "Show less" folds them), or, when the list has a page of its own, links to `allHref`
 */
export function Rows({ rows, empty, allHref, limit = MAX_ROWS }: { rows: ReactNode[]; empty: string; allHref?: string; limit?: number }) {
  const [expanded, setExpanded] = useState(false)
  if (rows.length === 0) return <p className="px-2 py-2 text-body text-fg-subtle">{empty}</p>
  const more = rows.length - limit
  return (
    <>
      <ul className={LIST}>
        {(expanded ? rows : rows.slice(0, limit)).map((row, i) => (
          <li key={i} className="border-t border-line first:border-t-0">
            {row}
          </li>
        ))}
      </ul>
      {more > 0 &&
        (allHref ? (
          <Link to={allHref} className="mt-1 inline-block px-2 text-small text-fg-muted hover:text-fg">
            Show all ({rows.length})
          </Link>
        ) : (
          <Button variant="text" icon={expanded ? LuChevronsUp : LuChevronsDown} onClick={() => setExpanded(!expanded)} className="mt-1 ms-2 self-start">
            {expanded ? 'Show less' : `Show all (${rows.length})`}
          </Button>
        ))}
    </>
  )
}

/** A row that isn't an object (a page, a combination, a layout): same look, opens on click */
export function LinkRow({ icon: Icon, label, hint, onOpen }: { icon: PlainIcon; label: string; hint?: string; onOpen: () => void }) {
  return (
    <button type="button" onClick={onOpen} className={`${PLAIN_ROW} w-full cursor-pointer text-start`}>
      <Icon className="size-(--btn-icon-size) shrink-0 text-fg-subtle" />
      <span className="min-w-0 flex-1 truncate">
        {label}
        {hint && <span className="text-fg-subtle"> · {hint}</span>}
      </span>
    </button>
  )
}
