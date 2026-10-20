import { LuChevronDown, LuPlus, LuX } from 'react-icons/lu'
import ExtendMenu, { type ExtendMenuItem } from '../../components/ui/overlays/ExtendMenu'
import { SORT_LABEL, type CardSort } from './sortByDate'

type SortChoice = CardSort | 'manual'
// The green Create button: as tall as the Sort button, its own shadow, darker while hovered or pressed
const CREATE =
  'corner-marks relative flex cursor-pointer items-center gap-1.5 self-stretch rounded-(--btn-radius) bg-create px-(--pill-px) py-(--pill-py) text-body font-medium text-create-fg transition-colors ' +
  '[box-shadow:var(--btn-create-shadow)] hover:bg-(--btn-create-hover-bg) hover:[box-shadow:var(--btn-hover-inset-dark),var(--btn-create-shadow)] ' +
  'active:[box-shadow:var(--btn-active-inset-dark),var(--btn-create-shadow)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'

const SORTS: ExtendMenuItem<SortChoice>[] = (Object.keys(SORT_LABEL) as CardSort[]).map((value) => ({ value, label: SORT_LABEL[value] }))
// While a sort is on, its button shows it (and leaves it out of its options); this one goes back to the server's order
const MANUAL: ExtendMenuItem<SortChoice> = { value: 'manual', label: 'Manual order' }

type Props = {
  name: string
  /** A click on the name opens the row's item (a project) */
  onOpen?: () => void
  sort: CardSort | null
  onSort: (sort: CardSort | null) => void
  /** What the green Add button can make here: one kind is a plain button, several a menu; none, no button */
  create: { kinds: ExtendMenuItem<string>[]; onCreate: (kind: string) => void }
}

/**
 * A Dashboard row's header: its name on the left (a project's opens it on a click), Sort by (a background only on hover; it extends:
 * ExtendMenu grows to show its options) and a green "Add +" on the right that makes an item in the row (a menu of kinds), as big as a
 * sidebar row.
 */
export default function RowHeader({ name, onOpen, sort, onSort, create }: Props) {
  const [only] = create.kinds
  return (
    <div className="flex items-center justify-between gap-3">
      {onOpen ? (
        <button type="button" onClick={onOpen} title={`Open ${name}`} className="min-w-0 cursor-pointer truncate rounded-(--corner-sm) text-start text-title hover:underline focus-visible:outline-2 focus-visible:outline-accent">
          {name}
        </button>
      ) : (
        <h2 className="min-w-0 truncate text-title">{name}</h2>
      )}
      <div className="flex shrink-0 items-center gap-2">
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
        {create.kinds.length === 1 && (
          <button type="button" onClick={() => create.onCreate(only.value)} className={CREATE}>
            {only.label}
            <LuPlus aria-hidden className="size-4" />
          </button>
        )}
        {create.kinds.length > 1 && (
          <ExtendMenu variant="create" padded={false} label={`Add to ${name}`} items={create.kinds} onSelect={create.onCreate}>
            {(open) => (
              <span className={`flex items-center gap-1.5 self-stretch rounded-(--btn-radius) px-(--pill-px) py-(--pill-py) transition-colors ${open ? 'hover-fill-strong' : 'bg-create hover:bg-(--btn-create-hover-bg)'}`}>
                Add
                {open ? <LuX aria-hidden className="size-4" /> : <LuPlus aria-hidden className="size-4" />}
              </span>
            )}
          </ExtendMenu>
        )}
      </div>
    </div>
  )
}
