import { useState } from 'react'
import { LuChevronDown, LuPencil, LuPlus, LuX } from 'react-icons/lu'
import ExtendMenu, { type ExtendMenuItem } from '../../components/ui/overlays/ExtendMenu'
import { SORT_LABEL, type CardSort } from './sortByDate'
import SplitButton from '../../components/ui/buttons/SplitButton'
import IconButton from '../../components/ui/buttons/IconButton'

type SortChoice = CardSort | 'manual'
const SORTS: ExtendMenuItem<SortChoice>[] = (Object.keys(SORT_LABEL) as CardSort[]).map((value) => ({ value, label: SORT_LABEL[value] }))
// While a sort is on, its button shows it (and leaves it out of its options); this one goes back to the server's order
const MANUAL: ExtendMenuItem<SortChoice> = { value: 'manual', label: 'Manual order' }

type Props = {
  name: string
  /** Marks the header as something that glides when the cards around it make room (features/drag/glide.ts) */
  reflowId?: string
  /** Renames the row's item in place (a project); none: the name cannot be edited (Orphans) */
  onRename?: (name: string) => void
  /** A click on the name opens the row's item (a project) */
  onOpen?: () => void
  sort: CardSort | null
  onSort: (sort: CardSort | null) => void
  /** What the green Add button can make here: one kind is a plain button, several a menu; none, no button */
  create: { kinds: ExtendMenuItem<string>[]; onCreate: (kind: string) => void }
}

/**
 * A Dashboard row's header: its name on the left (a project's opens it on a click; the ✎ on its right, on hover, renames it in place), Sort by (a background only on hover; it extends:
 * ExtendMenu grows to show its options) and a green "Add +" on the right that makes an item in the row (a menu of kinds), as big as a
 * sidebar row.
 */
export default function RowHeader({ name, reflowId, onRename, onOpen, sort, onSort, create }: Props) {
  const [only] = create.kinds
  const [editing, setEditing] = useState(false)
  return (
    <div data-reflow={reflowId} className="flex items-center justify-between gap-3">
      <div className="group/name flex min-w-0 items-center">
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
            className="min-w-0 flex-1 rounded-(--corner-sm) bg-transparent text-title outline-2 outline-accent [field-sizing:content]"
          />
        ) : (
          <>
            {onOpen ? (
              <button type="button" onClick={onOpen} title={`Open ${name}`} className="min-w-0 cursor-pointer truncate rounded-(--corner-sm) text-start text-title hover:underline focus-visible:outline-2 focus-visible:outline-accent">
                {name}
              </button>
            ) : (
              <h2 className="min-w-0 truncate text-title">{name}</h2>
            )}
            {/* ✎ on the name's right, on hover: renames it in place */}
            {onRename && (
              <IconButton
                icon={LuPencil}
                label={`Rename ${name}`}
                size="sm"
                onClick={() => setEditing(true)}
                className="ms-2 shrink-0 opacity-0 group-hover/name:opacity-100 focus-visible:opacity-100"
              />
            )}
          </>
        )}
      </div>
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
          <SplitButton icon={<LuPlus />} iconPosition="right" onClick={() => create.onCreate(only.value)}>
            {only.label}
          </SplitButton>
        )}
        {create.kinds.length > 1 && (
          <ExtendMenu
            variant="create"
            label={`Add to ${name}`}
            items={create.kinds}
            onSelect={create.onCreate}
            splitIcon={(open) => (open ? <LuX /> : <LuPlus />)}
            iconPosition="right"
          >
            Add
          </ExtendMenu>
        )}
      </div>
    </div>
  )
}
