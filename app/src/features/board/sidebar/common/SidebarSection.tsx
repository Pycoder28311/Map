import { useSyncExternalStore, type ReactNode } from 'react'
import { LuChevronDown, LuChevronUp } from 'react-icons/lu'
import IconButton from '../../../../components/ui/buttons/IconButton'

// Which sections of a sidebar are open, kept for the page (the same in the Text tool's panel and a selected text's) and
// between visits: what was chosen by the person, else the section's own start
const KEY = 'map.textSections.v2'
const listeners = new Set<() => void>()
let chosen: Record<string, boolean> = {}
try {
  chosen = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Record<string, boolean>
} catch {
  // No storage (private window…): the sections just start as they are
}

/** The sections that start open */
const STARTS_OPEN = new Set(['size', 'font', 'fill', 'line-colour', 'line-type', 'shape', 'pin', 'border-way', 'border-fill', 'border-county', 'border-description'])
const isOpenNow = (id: string) => chosen[id] ?? STARTS_OPEN.has(id)

function toggleSection(id: string) {
  chosen = { ...chosen, [id]: !isOpenNow(id) }
  try {
    localStorage.setItem(KEY, JSON.stringify(chosen))
  } catch {
    // Not saved, still toggled
  }
  listeners.forEach((l) => l())
}

/** Opens a section if it is closed (a checkbox in its title that switches something on shows what it has) */
export function openSection(id: string) {
  if (!isOpenNow(id)) toggleSection(id)
}

const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}

type Props = {
  /** Its name in what is kept (not shown) */
  id: string
  title: string
  /** The first section has no line above it */
  first?: boolean
  /** Always open, with no arrow */
  fixed?: boolean
  /** At the left of the title (a checkbox that switches what the section makes on or off) */
  leading?: ReactNode
  /** At the right of the title (a button of the section) */
  actions?: ReactNode
  children: ReactNode
}

/** A section of a sidebar: its title with a toggle arrow on the right (the title's colour); the bar lights up under the pointer while closed, and its tools show when it is open */
export default function SidebarSection({ id, title, first, fixed, leading, actions, children }: Props) {
  const isOpen = useSyncExternalStore(subscribe, () => fixed || isOpenNow(id))
  const toggle = () => toggleSection(id)
  return (
    // The hover bar goes from edge to edge of the sidebar (the side padding it has is given back, so the title and arrow stay where they are) and from
    // its own top line to the next section's (the gap below it is part of it), square. Its line stops short of the edges, as the content does.
    // Closed: it lights up under the pointer, and a click anywhere on it opens it
    <section
      aria-label={title}
      onClick={isOpen ? undefined : toggle}
      className={`relative -mx-3 -mb-3 flex flex-col gap-2 px-3 pb-3 ${first ? '' : 'pt-[calc(0.75rem+1px)] before:absolute before:inset-x-3 before:top-0 before:h-px before:bg-line'} ${isOpen ? '' : 'cursor-pointer hover:bg-fill'}`}
    >
      <div className="flex items-center gap-1">
        {leading && <div className="me-1.5" onClick={(e) => e.stopPropagation()}>{leading}</div>}
        {fixed ? (
          <h3 className="flex-1 text-body text-fg-muted">{title}</h3>
        ) : (
          <button type="button" aria-expanded={isOpen} onClick={isOpen ? toggle : undefined} className="flex-1 cursor-pointer self-stretch text-start text-body text-fg-muted">
            {title}
          </button>
        )}
        {actions && <div onClick={(e) => e.stopPropagation()}>{actions}</div>}
        {!fixed && <IconButton icon={isOpen ? LuChevronUp : LuChevronDown} label={`${isOpen ? 'Hide' : 'Show'} ${title}`} aria-expanded={isOpen} className="text-fg-muted" onClick={isOpen ? toggle : undefined} />}
      </div>
      {isOpen && children}
    </section>
  )
}
