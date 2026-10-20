import { Fragment } from 'react'
import { LuChevronRight, LuHouse, LuMinus } from 'react-icons/lu'
import Dropdown, { type DropdownOption } from '../../components/ui/overlays/Dropdown'
import type { MockObject } from '../../mocks/projects'
import { KIND_ICON } from '../../mocks/sidebarTree'
import { choicesAt, type Path } from './place'

// A part of the path: a small button with its menu, next to the others
const PART = 'px-1.5! py-0.5! text-body! font-medium text-fg!'

type Props = {
  /** The visible objects */
  objects: MockObject[]
  path: Path
  onChange: (path: Path) => void
}

/**
 * The path of where a new object goes, like a file explorer's address bar: the place and its parents
 * (`City parks › Guides`). Each part opens a menu of the other things that could stand there; picking
 * one replaces the part and drops what followed; a − on a hovered part goes back to its parent. A last › goes one level deeper. The first menu also
 * has the top level. It never navigates: the page stays where it is.
 */
export default function CreatePath({ objects, path, onChange }: Props) {
  const rootLabel = 'Top level'
  const byId = (id: string) => objects.find((o) => o.id === id)
  const optionOf = (o: MockObject): DropdownOption<string> => ({ value: o.id, label: o.name, icon: KIND_ICON[o.kind] as DropdownOption<string>['icon'] })
  // One level deeper than the path (with no place yet, the first part's menu is that)
  const deeper = path.length > 0 ? choicesAt(objects, path, path.length) : []

  // The first part always exists: the top level when the path is empty
  const parts = path.length === 0 ? [''] : path

  return (
    <nav aria-label="Where it goes" className="flex flex-wrap items-center gap-0.5">
      {parts.map((id, i) => {
        const current = id ? byId(id) : undefined
        const options: DropdownOption<string>[] = [
          ...(i === 0 ? [{ value: '', label: rootLabel, icon: LuHouse }] : []),
          ...(current ? [optionOf(current)] : []),
          ...choicesAt(objects, path, i).map(optionOf),
        ]
        return (
          <Fragment key={`${i}:${id}`}>
            {i > 0 && <LuChevronRight aria-hidden className="size-3.5 shrink-0 text-fg-subtle" />}
            <span className="group/part relative inline-flex">
              <Dropdown
                label={i === 0 ? 'Place' : `Inside ${byId(path[i - 1])?.name ?? ''}`}
                value={id}
                options={options}
                hoverChevron
                className={PART}
                onChange={(next) => onChange(next === '' ? [] : [...path.slice(0, i), next])}
              />
              {/* Hovering a part: a − at its left end that goes back to its parent (this part and what followed are dropped) */}
              {current && (
                <button
                  type="button"
                  aria-label={`Back to ${i === 0 ? rootLabel : (byId(path[i - 1])?.name ?? 'the parent')}`}
                  title={`Back to ${i === 0 ? rootLabel : (byId(path[i - 1])?.name ?? 'the parent')}`}
                  onClick={() => onChange(path.slice(0, i))}
                  className="absolute inset-y-0.5 start-0.5 flex cursor-pointer items-center rounded-(--btn-close-radius) bg-surface/80 px-0.5 text-fg opacity-0 transition-opacity hover:bg-fill focus-visible:opacity-100 group-hover/part:opacity-100"
                >
                  <LuMinus aria-hidden className="size-4" />
                </button>
              )}
            </span>
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
