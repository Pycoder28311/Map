import { useState } from 'react'
import { LuChevronDown, LuPlus, LuX } from 'react-icons/lu'
import ExtendMenu, { type ExtendMenuItem } from '../../components/ui/overlays/ExtendMenu'
import { KIND_LABEL, type ObjectKind } from '../../mocks/projects'
import { KIND_ICON } from '../../mocks/sidebarTree'
import { SORT_LABEL, type CardSort } from './rows'

type SortChoice = CardSort | 'manual'
// One part of the split Create button: as tall as the button, rounded on its outer side only (the two
// sides facing each other are square). Closed: its own green button,
// darker while hovered. Open: part of the dropdowns' gray shape, darker while hovered
const PART = 'flex items-center self-stretch py-(--pill-py) transition-colors'
const PART_HOVER = { closed: 'bg-create hover:bg-(--btn-create-hover-bg)', open: 'hover-fill-strong' }
// The split button's parts: while hovered / pressed, an inner shadow of their own (the outer shadow is the whole button's)
const SPLIT_HOVER = {
  closed: `${PART_HOVER.closed} hover:[box-shadow:var(--btn-hover-inset-dark)] active:[box-shadow:var(--btn-active-inset-dark)]`,
  open: PART_HOVER.open,
}

const SORTS: ExtendMenuItem<SortChoice>[] = (Object.keys(SORT_LABEL) as CardSort[]).map((value) => ({ value, label: SORT_LABEL[value] }))
// While a sort is on, its button shows it (and leaves it out of its options); this one goes back to the manual order
const MANUAL: ExtendMenuItem<SortChoice> = { value: 'manual', label: 'Manual order' }
const CREATE_ORDER: ObjectKind[] = ['object', 'map']

type Props = {
  name: string
  sort: CardSort | null
  onSort: (sort: CardSort | null) => void
  /** What Create offers here */
  creatable: ObjectKind[]
  onCreate: (kind: ObjectKind) => void
  /** A row of a resource (the server's notes): one plain green button with this label, instead of the kinds */
  createOne?: { label: string; onCreate: () => void }
  /**
   * Create names what it makes: "<kind> +", a click on the name creates it at once (a resource's row: its only
   * kind). Off (Objects): "Create ▾", a menu of kinds
   */
  named?: boolean
}

/**
 * A Dashboard row's header: its name on the left, Sort by (a background only on hover) and Create (green) on the
 * right, as big as a sidebar row; they extend (ExtendMenu: the button grows to show its options).
 * Create is split in two parts with a small gap between (Create ▾); both open its menu. Named
 * (`named`): a resource's row (`createOne`) has "Note +".
 */
export default function RowHeader({ name, sort, onSort, creatable, onCreate, createOne, named = false }: Props) {
  // The kind a named Create makes: the last one picked from its menu (the first at the start)
  const [picked, setPicked] = useState<ObjectKind | null>(null)
  const kind = picked && creatable.includes(picked) ? picked : (creatable[0] ?? 'object')
  const createItems = CREATE_ORDER.filter((k) => creatable.includes(k)).map((value) => ({ value, label: KIND_LABEL[value], icon: KIND_ICON[value] }))

  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="min-w-0 truncate text-title">{name}</h2>

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
        {named && creatable.length <= 1 ? (
          // One kind (the Notes row): a plain green button that creates it
          <button
            type="button"
            onClick={() => (createOne ? createOne.onCreate() : onCreate(kind))}
            className={`${PART} ${PART_HOVER.closed} corner-marks relative cursor-pointer gap-1.5 rounded-(--btn-radius) px-(--pill-px) text-body font-medium text-create-fg [box-shadow:var(--btn-create-shadow)] hover:[box-shadow:var(--btn-hover-inset-dark),var(--btn-create-shadow)] active:[box-shadow:var(--btn-active-inset-dark),var(--btn-create-shadow)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent`}
          >
            {createOne?.label ?? KIND_LABEL[kind]}
            <LuPlus aria-hidden className="size-4" />
          </button>
        ) : (
        /* Split: two separate green buttons with a small gap (2px, the page shows through) that darken on their
            own when hovered. Open: one gray shape like the other dropdowns, and the arrow is an ✕ */
        <ExtendMenu
          variant="create"
          padded={false}
          label={`Create in ${name}`}
          items={createItems}
          onSelect={(next) => {
            setPicked(next)
            onCreate(next)
          }}
        >
          {(open) => (
            <>
              {named ? (
                // Not part of the menu button's own click: it creates the kind at once (the menu is on the arrow)
                <span
                  onClick={(e) => {
                    e.stopPropagation()
                    onCreate(kind)
                  }}
                  className={`${PART} ${SPLIT_HOVER[open ? 'open' : 'closed']} cursor-pointer rounded-s-(--btn-radius) px-(--pill-px)`}
                >
                  {KIND_LABEL[kind]}
                </span>
              ) : (
                <span className={`${PART} ${SPLIT_HOVER[open ? 'open' : 'closed']} rounded-s-(--btn-radius) px-(--pill-px)`}>Create</span>
              )}
              <span aria-hidden className={`${PART} ${SPLIT_HOVER[open ? 'open' : 'closed']} ms-0.5 rounded-e-(--btn-radius) px-2`}>
                {open ? <LuX className="size-4" /> : named ? <LuPlus className="size-4" /> : <LuChevronDown className="size-4" />}
              </span>
            </>
          )}
        </ExtendMenu>
        )}
      </div>
    </div>
  )
}
