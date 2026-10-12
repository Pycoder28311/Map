// Plain lists of rows (the Dashboard's columns, the navbar's Recent History): the list with its lines
// and "Show more", an object's row (draggable, opens on click, takes note links), and a row for
// anything else (a page, a combination of panes, a saved layout).
import { useState, type ReactNode } from 'react'
import { LuChevronsDown, LuChevronsUp } from 'react-icons/lu'
import { Link, useNavigate } from 'react-router-dom'
import DropIcon from '../../components/ui/drop/DropIcon'
import type { PlainIcon } from '../../components/ui/icons/IconSlot'
import type { MockObject } from '../../mocks/projects'
import { isLinkTarget, linksOf } from '../../mocks/projectsStore'
import { KIND_ICON } from '../../mocks/sidebarTree'
import type { useLinkNode } from '../links/linkNode'
import { single, type WorkspaceLayout } from '../workspace/layout'
import { usePanelRegistry } from '../workspace/registryContext'
import type { PanelRef } from '../workspace/types'
import { hrefFor } from '../workspace/useWorkspace'
import ObjectRow, { PLAIN_ROW } from './ObjectRow'

/** Rows shown before "Show more" */
const MAX_ROWS = 8

// Full class strings so Tailwind can detect them at build time.
// A line between rows; a hovered row hides the lines above and below it (not while dragging)
const LIST =
  'flex flex-col [html:not([data-dragging])_&>li:hover]:border-transparent [html:not([data-dragging])_&>li:hover+li]:border-transparent'

/** Navigates to one panel on its own, or a combination (never added beside the current page) */
export function useOpenLayout() {
  const registry = usePanelRegistry()
  const navigate = useNavigate()
  return (layout: WorkspaceLayout) => navigate(hrefFor(layout, registry))
}

/**
 * The rows, the first `limit` until "Show more" (or a "Show all" link to `allHref`, when the list has
 * a page of its own)
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
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="mt-1 inline-flex cursor-pointer items-center gap-1 px-2 text-small text-fg-muted hover:text-fg"
          >
            {expanded ? <LuChevronsUp className="size-3.5" /> : <LuChevronsDown className="size-3.5" />}
            {expanded ? 'Show less' : `Show more (${more})`}
          </button>
        ))}
    </>
  )
}

/**
 * One object as a list row: drags anywhere, opens on click (`afterOpen`: e.g. close a popout), and a
 * project's or map's row takes notes (its link node). `place` keeps drag and link ids unique.
 */
export function ObjectListRow({
  object,
  hint,
  place,
  linkNodeFor,
  open,
  afterOpen,
}: {
  object: MockObject
  hint?: string
  place: string
  linkNodeFor: ReturnType<typeof useLinkNode>
  open: (layout: WorkspaceLayout) => void
  afterOpen?: () => void
}) {
  // A project opens its Overview
  const panel: PanelRef = { type: object.kind, id: object.id }
  // Projects, maps and object cards take links (a note dropped on the node at the row's end)
  const link = isLinkTarget(object.kind) ? linkNodeFor(object.id, place, object.name) : undefined
  return (
    <ObjectRow
      object={object}
      icon={KIND_ICON[object.kind]}
      dragId={`${place}:${object.id}`}
      panel={panel}
      hint={hint}
      links={linksOf(object.id).length}
      variant="plain"
      onOpen={() => {
        open(single(panel))
        afterOpen?.()
      }}
      className={link?.active ? 'ring-2 ring-drop' : ''}
      end={link && <DropIcon {...link} size="small" />}
    />
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
