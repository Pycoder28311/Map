import type { CSSProperties } from 'react'
import { LuCompass } from 'react-icons/lu'
import { NavLink } from 'react-router-dom'
import { SIDEBAR_ROW, TREE_ROW_LOOK } from '../../ui/rowStyles'

// Full class strings so Tailwind can detect them at build time.
// Closed sidebar: as wide as a rail row (its icon's box + the row padding), like the Trash row
const RAIL_ROW = 'max-w-[calc(2*var(--btn-px)+var(--btn-icon-size)+2*var(--btn-close-p))]'

/**
 * Explore (docs/plans/41), at the bottom of the sidebar just above the Trash, in its look: an icon and "Explore", only the icon in the
 * closed sidebar, the current-page look while on /explore. A link to the Explore page
 */
export default function ExploreLink({ compact }: { compact: boolean }) {
  return (
    // The row's look is on its box (it fills while the link inside is the current page: .ui-field-row:has([aria-current=page]))
    <div className={`${TREE_ROW_LOOK} w-full transition-[max-width] duration-(--sidebar-duration) ${compact ? RAIL_ROW : 'max-w-full'}`}>
      <NavLink
        to="/explore"
        title="Explore"
        aria-label="Explore"
        // Closed: its icon as big as the objects' (bigger than open), centred in the square row, like the Trash's
        style={compact ? ({ '--tree-row-icon': 'var(--sidebar-icon-closed)', '--tree-row-px': 'var(--sidebar-row-px-closed)' } as CSSProperties) : undefined}
        className={`${SIDEBAR_ROW} w-full justify-start text-fg-muted`}
      >
        <span className="ms-(--btn-icon-offset-start) flex shrink-0">
          <LuCompass aria-hidden className="size-(--tree-row-icon) transition-[width,height] duration-(--sidebar-duration) ease-out motion-reduce:transition-none" />
        </span>
        {/* Closed sidebar: only the icon (the label fades out and takes no space) */}
        <span
          className={`overflow-hidden whitespace-nowrap transition-[max-width,opacity] duration-(--sidebar-duration) ease-out motion-reduce:transition-none ${
            compact ? 'max-w-0 opacity-0' : 'max-w-24'
          }`}
        >
          Explore
        </span>
      </NavLink>
    </div>
  )
}
