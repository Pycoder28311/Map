import { useState } from 'react'
import { LuChevronDown, LuPencil, LuX } from 'react-icons/lu'
import ExtendMenu, { type ExtendMenuItem } from '../../components/ui/overlays/ExtendMenu'
import { KIND_LABEL, type ObjectKind } from '../../mocks/projects'
import { KIND_ICON } from '../../mocks/sidebarTree'
import { SORT_LABEL, type CardSort } from './rows'

type CreatableKind = Exclude<ObjectKind, 'project'>

type SortChoice = CardSort | 'manual'
// One part of the split Create button: as tall as the button, darker while hovered (green when closed,
// the dropdowns' gray when open)
const PART = 'flex items-center self-stretch py-(--pill-py) transition-colors'
const PART_HOVER = { closed: 'hover:bg-create-hover', open: 'hover:bg-fill-strong' }

const SORTS: ExtendMenuItem<SortChoice>[] = (Object.keys(SORT_LABEL) as CardSort[]).map((value) => ({ value, label: SORT_LABEL[value] }))
// While a sort is on, its button shows it (and leaves it out of its options); this one goes back to the manual order
const MANUAL: ExtendMenuItem<SortChoice> = { value: 'manual', label: 'Manual order' }
const CREATE_ORDER: CreatableKind[] = ['object', 'article', 'note', 'map', 'folder']

type Props = {
  name: string
  /** Renames the row (projects); none: the name can't be edited (Orphans) */
  onRename?: (name: string) => void
  sort: CardSort | null
  onSort: (sort: CardSort | null) => void
  /** What Create offers here (e.g. no Map at the top level) */
  creatable: CreatableKind[]
  onCreate: (kind: CreatableKind) => void
}

/**
 * A Dashboard row's header: its name on the left (a project's is edited in place: hover shows ✎ and a
 * text cursor, a click edits it), Sort by (a background only on hover) and Create (green) on the
 * right, as big as a sidebar row; they extend (ExtendMenu: the button grows to show its options).
 * Create is split (Create │ ▾); both parts open its menu.
 */
export default function RowHeader({ name, onRename, sort, onSort, creatable, onCreate }: Props) {
  const [editing, setEditing] = useState(false)
  const createItems = CREATE_ORDER.filter((k) => creatable.includes(k)).map((value) => ({ value, label: KIND_LABEL[value], icon: KIND_ICON[value] }))

  return (
    <div className="flex items-center justify-between gap-3">
      {editing && onRename ? (
        <input
          defaultValue={name}
          aria-label="Project name"
          autoFocus
          onFocus={(e) => e.currentTarget.select()}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur()
            if (e.key === 'Escape') {
              e.currentTarget.value = name
              e.currentTarget.blur()
            }
          }}
          onBlur={(e) => {
            const next = e.currentTarget.value.trim()
            if (next && next !== name) onRename(next)
            setEditing(false)
          }}
          className="-ms-6 min-w-0 flex-1 rounded-[6px] bg-transparent ps-6 text-title outline-2 outline-accent [field-sizing:content]"
        />
      ) : onRename ? (
        // ✎ appears on the name's left on hover (it hangs into the margin, so the name never moves)
        <button
          type="button"
          onClick={() => setEditing(true)}
          title="Rename"
          className="group/name relative -ms-6 flex min-w-0 cursor-text items-center ps-6 text-start text-title"
        >
          <LuPencil aria-hidden className="absolute start-0 size-4 text-fg-subtle opacity-0 transition-opacity group-hover/name:opacity-100 group-focus-visible/name:opacity-100" />
          <span className="truncate">{name}</span>
        </button>
      ) : (
        <h2 className="truncate text-title">{name}</h2>
      )}

      <div className="flex shrink-0 items-center gap-2">
        {/* They extend: the button grows down to show its options (not the one it already shows), and
            wider for a wide one, the same on both sides (its text stays put) */}
        <ExtendMenu
          variant="ghost"
          label={`Sort ${name}`}
          items={sort ? [...SORTS, MANUAL] : SORTS}
          value={sort}
          onSelect={(next) => onSort(next === 'manual' ? null : next)}
        >
          {sort ? SORT_LABEL[sort] : 'Sort by'}
          <LuChevronDown aria-hidden className="size-4" />
        </ExtendMenu>
        {/* Split: each part fills the button's height and darkens on its own when hovered; the thin line
            between them (4px short of the top and bottom edges) goes while the arrow part is hovered.
            Open: gray like the other dropdowns, and the arrow is an ✕ */}
        <ExtendMenu variant="create" padded={false} label={`Create in ${name}`} items={createItems} onSelect={onCreate}>
          {(open) => (
            <>
              <span className={`${PART} ${PART_HOVER[open ? 'open' : 'closed']} px-(--pill-px)`}>Create</span>
              <span aria-hidden className={`${PART} ${PART_HOVER[open ? 'open' : 'closed']} group/arrow relative px-2`}>
                <span
                  className={`absolute inset-y-1 start-0 w-px transition-[opacity,background-color] group-hover/arrow:opacity-0 ${open ? 'bg-fg/20' : 'bg-create-fg/30'}`}
                />
                {open ? <LuX className="size-4" /> : <LuChevronDown className="size-4" />}
              </span>
            </>
          )}
        </ExtendMenu>
      </div>
    </div>
  )
}
