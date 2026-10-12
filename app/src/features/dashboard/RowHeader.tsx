import { useState } from 'react'
import { LuChevronDown, LuPencil } from 'react-icons/lu'
import ButtonMenu, { type ButtonMenuItem } from '../../components/ui/overlays/ButtonMenu'
import { KIND_LABEL, type ObjectKind } from '../../mocks/projects'
import { KIND_ICON } from '../../mocks/sidebarTree'
import { SORT_LABEL, type CardSort } from './rows'

type CreatableKind = Exclude<ObjectKind, 'project'>

const SORTS: ButtonMenuItem<CardSort>[] = (Object.keys(SORT_LABEL) as CardSort[]).map((value) => ({ value, label: SORT_LABEL[value] }))
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
 * right, as big as a sidebar row, their menus popping out below them. Create is split (Create │ ▾);
 * both parts open its menu.
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
        <ButtonMenu variant="ghost" label={`Sort ${name}`} items={SORTS} value={sort} onSelect={(next) => onSort(next === sort ? null : next)}>
          {sort ? SORT_LABEL[sort] : 'Sort by'}
          <LuChevronDown aria-hidden className="size-4" />
        </ButtonMenu>
        <ButtonMenu variant="create" label={`Create in ${name}`} items={createItems} onSelect={onCreate} className="gap-0! px-0!">
          <span className="px-(--pill-px)">Create</span>
          {/* The split: a thin line, then the arrow (both open the same menu) */}
          <span aria-hidden className="flex items-center self-stretch border-s border-create-fg/30 px-2">
            <LuChevronDown className="size-4" />
          </span>
        </ButtonMenu>
      </div>
    </div>
  )
}
