import { Fragment } from 'react'
import { LuChevronRight } from 'react-icons/lu'
import Dropdown, { type DropdownOption } from '../overlays/Dropdown'

export type Crumb = {
  /** Its level's name, for screen readers (e.g. "Project") */
  label: string
  /** The one shown */
  value: string
  /** Its level's choices (the one shown among them): picking one goes there */
  options: DropdownOption<string>[]
}

type Props = {
  crumbs: Crumb[]
  /** A choice of the level `index` was picked */
  onPick: (index: number, value: string) => void
  /** Shown instead when there are no crumbs (e.g. "No project") */
  empty?: string
  className?: string
}

/**
 * Where something is, from the top down: Project › Folder › … Each level is a Dropdown showing the current one, with the other choices
 * of that level (its siblings) to go to instead.
 *
 *   <Breadcrumbs crumbs={[{ label: 'Project', value: '5', options }]} onPick={(i, value) => …} />
 */
export default function Breadcrumbs({ crumbs, onPick, empty, className = '' }: Props) {
  return (
    <nav aria-label="Breadcrumbs" className={`flex min-w-0 flex-wrap items-center gap-0.5 ${className}`}>
      {crumbs.length === 0 && empty && <span className="px-1 text-small text-fg-subtle">{empty}</span>}
      {crumbs.map((crumb, i) => (
        <Fragment key={i}>
          {i > 0 && <LuChevronRight aria-hidden className="size-3.5 shrink-0 text-fg-subtle" />}
          <Dropdown label={crumb.label} value={crumb.value} options={crumb.options} onChange={(value) => onPick(i, value)} hoverChevron />
        </Fragment>
      ))}
    </nav>
  )
}
