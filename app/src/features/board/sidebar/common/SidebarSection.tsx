import { useSyncExternalStore, type ReactNode } from 'react'
import { LuChevronDown, LuChevronUp } from 'react-icons/lu'
import CheckField from '../../../../components/ui/fields/CheckField'
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
const STARTS_OPEN = new Set(['size', 'font', 'fill', 'line-colour', 'line-type', 'pin', 'border-way', 'border-fill', 'border-county', 'border-description'])
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
  /** At the left of the title */
  leading?: ReactNode
  /** A checkbox that switches what the section makes on or off; the section is open exactly while it is checked (opening it checks it, closing it unchecks it) */
  check?: { checked: boolean; onChange: (on: boolean) => void; label: string }
  /** At the right of the title (a button of the section) */
  actions?: ReactNode
  children: ReactNode
}

/** A section of a sidebar: its title with a toggle arrow on the right (the title's colour); the bar lights up under the pointer while closed, and its tools show when it is open */
export default function SidebarSection({ id, title, first, fixed, leading: own, check, actions, children }: Props) {
  const stored = useSyncExternalStore(subscribe, () => fixed || isOpenNow(id))
  const isOpen = check ? check.checked : stored
  const toggle = () => (check ? check.onChange(!check.checked) : toggleSection(id))
  const leading = check ? <CheckField label="" aria-label={check.label} checked={check.checked} onChange={check.onChange} /> : own
  return (
    // The hover bar goes from edge to edge of the sidebar (the side padding it has is given back, so the title and arrow stay where they are) and from
    // its own top line to the next section's (the gap below it is part of it), square. Its line stops short of the edges, as the content does.
    // Closed: it lights up under the pointer, and a click anywhere on it opens it
    <section
      aria-label={title}
      onClick={isOpen ? undefined : toggle}
      className={`relative -mx-3 -mb-3 flex flex-col gap-3 px-3 pb-3 ${first ? '' : 'pt-[calc(0.75rem+1px)] before:absolute before:inset-x-3 before:top-0 before:h-px before:bg-line'} ${isOpen ? '' : 'group/sec cursor-pointer hover-fill'}`}
    >
      {/* Open: the title bar lights up under the pointer like the closed section does, from the section's top line to just under the title, edge to edge */}
      <div
        onClick={isOpen && !fixed ? toggle : undefined}
        className={`flex items-center gap-1 ${isOpen && !fixed ? `group/sec -mx-3 -mb-1.5 cursor-pointer px-3 pb-2 hover:bg-[linear-gradient(to_bottom,var(--fill-strong),transparent_30px)] ${first ? '' : '-mt-[calc(0.75rem+1px)] pt-[calc(0.75rem+1px)]'}` : ''}`}
      >
        {leading && <div className="me-1.5" onClick={(e) => e.stopPropagation()}>{leading}</div>}
        {fixed ? (
          <h3 className="flex-1 text-body text-fg-muted">{title}</h3>
        ) : (
          <button type="button" aria-expanded={isOpen} className="flex-1 cursor-pointer self-stretch text-start text-body text-fg-muted">
            {title}
          </button>
        )}
        {actions && <div onClick={(e) => e.stopPropagation()}>{actions}</div>}
        {!fixed && <IconButton icon={isOpen ? LuChevronUp : LuChevronDown} label={`${isOpen ? 'Hide' : 'Show'} ${title}`} aria-expanded={isOpen} hoverEffect={false} className="text-fg-muted hover:bg-transparent! [&_svg]:transition-[scale] group-hover/sec:[&_svg]:scale-[1.45]" />}
      </div>
      {isOpen && children}
    </section>
  )
}
