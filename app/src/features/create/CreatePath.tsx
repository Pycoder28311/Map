import { Fragment } from 'react'
import { LuChevronRight, LuHouse } from 'react-icons/lu'
import Dropdown, { type DropdownOption } from '../../components/ui/overlays/Dropdown'
import type { MockObject } from '../../mocks/projects'
import { KIND_ICON } from '../../mocks/sidebarTree'
import { choicesAt, type CreateKind, type Path } from './place'

// A part of the path: a small button with its menu, next to the others
const PART = 'px-1.5! py-0.5! text-body! font-medium text-fg!'

type Props = {
  /** The visible objects */
  objects: MockObject[]
  path: Path
  kind: CreateKind
  onChange: (path: Path) => void
}

/**
 * The path of where a new object goes, like a file explorer's address bar: the place and its parents
 * (`City parks › Guides`). Each part opens a menu of the other things that could stand there; picking
 * one replaces the part and drops what followed. A last › goes one level deeper. The first menu also
 * has the top level (a note: no link). It never navigates: the page stays where it is.
 */
export default function CreatePath({ objects, path, kind, onChange }: Props) {
  const rootLabel = kind === 'note' ? 'No link' : 'Top level'
  const byId = (id: string) => objects.find((o) => o.id === id)
  const optionOf = (o: MockObject): DropdownOption<string> => ({ value: o.id, label: o.name, icon: KIND_ICON[o.kind] as DropdownOption<string>['icon'] })
  // One level deeper than the path (with no place yet, the first part's menu is that)
  const deeper = path.length > 0 ? choicesAt(objects, path, path.length, kind) : []

  // The first part always exists: the top level when the path is empty
  const parts = path.length === 0 ? [''] : path

  return (
    <nav aria-label="Where it goes" className="flex flex-wrap items-center gap-0.5">
      {parts.map((id, i) => {
        const current = id ? byId(id) : undefined
        const options: DropdownOption<string>[] = [
          ...(i === 0 ? [{ value: '', label: rootLabel, icon: LuHouse }] : []),
          ...(current ? [optionOf(current)] : []),
          ...choicesAt(objects, path, i, kind).map(optionOf),
        ]
        return (
          <Fragment key={`${i}:${id}`}>
            {i > 0 && <LuChevronRight aria-hidden className="size-3.5 shrink-0 text-fg-subtle" />}
            <Dropdown
              label={i === 0 ? 'Place' : `Inside ${byId(path[i - 1])?.name ?? ''}`}
              value={id}
              options={options}
              className={PART}
              onChange={(next) => onChange(next === '' ? [] : [...path.slice(0, i), next])}
            />
          </Fragment>
        )
      })}
      {/* One level deeper (its trigger is the ›) */}
      {deeper.length > 0 && (
        <Dropdown
          label="Choose inside"
          triggerIcon={LuChevronRight}
          value=""
          options={deeper.map(optionOf)}
          className="text-fg-subtle!"
          onChange={(next) => onChange([...path, next])}
        />
      )}
    </nav>
  )
}
