import { useEffect, useRef, useState } from 'react'
import SearchInput from '../../../components/ui/fields/SearchInput'
import { DROPDOWN_ITEM } from '../../../components/ui/overlays/Dropdown'
import { groupSections, type SectionType } from './sectionTypes'
import { useSectionMenu } from './useSectionMenu'

type Props = {
  types: SectionType[]
  /** The kind the keyboard is on (its index in `types`) */
  active: number
  onActive: (index: number) => void
  onPick: (type: SectionType) => void
}

/** The section kinds in their groups, each group under its name. Pressing one keeps the caret in the text */
export default function SectionMenu({ types, active, onActive, onPick }: Props) {
  const list = useRef<HTMLDivElement>(null)
  useEffect(() => {
    list.current?.querySelector<HTMLElement>('[data-active]')?.scrollIntoView({ block: 'nearest' })
  }, [active])

  if (types.length === 0) return <p className="px-2 py-1 text-small text-fg-subtle">No sections match.</p>
  let index = -1
  return (
    <div ref={list} role="menu" aria-label="Sections" className="flex max-h-80 flex-col gap-1 overflow-y-auto overscroll-contain">
      {groupSections(types).map(({ group, types: inGroup }) => (
        <div key={group} role="group" aria-label={group} className="flex flex-col">
          <p className="px-(--menu-item-px) pt-1 pb-0.5 text-[0.75rem] font-medium text-fg-subtle">{group}</p>
          {inGroup.map((type) => {
            const at = ++index
            const Icon = type.icon
            return (
              <button
                key={type.id}
                type="button"
                role="menuitem"
                data-active={at === active ? '' : undefined}
                className={`${DROPDOWN_ITEM} data-active:bg-fill`}
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => onActive(at)}
                onClick={() => onPick(type)}
              >
                <Icon aria-hidden className="size-4 shrink-0 text-fg-muted" />
                <span className="truncate">{type.label}</span>
              </button>
            )
          })}
        </div>
      ))}
    </div>
  )
}

/** The menu with a field to filter it, for a popout of its own (the toolbar's Add section, the button under the last row) */
export function SectionPicker({ onPick }: { onPick: (type: SectionType) => void }) {
  const [query, setQuery] = useState('')
  const menu = useSectionMenu(query, onPick)
  return (
    <div className="flex flex-col gap-2">
      <SearchInput label="Find a section" value={query} autoFocus onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => menu.onKey(e)} />
      <SectionMenu types={menu.types} active={menu.active} onActive={menu.setActive} onPick={onPick} />
    </div>
  )
}
