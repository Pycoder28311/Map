import type { CSSProperties } from 'react'
import SidebarTree from './SidebarTree'
import { useHoverIntent } from './useHoverIntent'
import { useSidebar } from './useSidebar'

// Hover on the rail: open after resting this long, close this long after leaving (ms)
const PEEK_OPEN_DELAY = 200
const PEEK_CLOSE_DELAY = 150

const FULL = 'var(--sidebar-w)'
const RAIL = 'var(--sidebar-rail)'
// Sidebar padding left/right that centers a top-level row in the rail: what's left of the rail
// after a compact row (its icon's box + its padding on both sides), split on both sides
const PX = 'calc((var(--sidebar-rail) - 2 * var(--btn-px) - var(--btn-icon-size) - 2 * var(--btn-close-p)) / 2)'
const ANIMATE = 'duration-(--sidebar-duration) ease-out motion-reduce:transition-none'

/**
 * Side navigation, in three looks (state: useSidebar.ts):
 * - pinned (wide screens, ☰): full width, pushes the page right
 * - rail (wide screens, unpinned): thin, icons only; opens over the page while hovered (peek)
 * - drawer (narrow screens): hidden; ☰ opens it over the page, with a dimmed backdrop
 *
 * Two boxes: the outer one takes space in the row (what pushes the page), the nav lies on it and
 * may be wider (over the page). The tree inside always has the full width and the nav clips it, so
 * opening and closing only reveal/hide the names; no icon ever moves.
 */
export default function Sidebar() {
    const { isWide, pinned, drawerOpen, closeDrawer } = useSidebar()
    const peek = useHoverIntent({ enabled: isWide && !pinned, openDelay: PEEK_OPEN_DELAY, closeDelay: PEEK_CLOSE_DELAY })

    const space = isWide ? (pinned ? FULL : RAIL) : '0px'
    const open = isWide ? pinned || peek.open : drawerOpen
    const width = open ? FULL : isWide ? RAIL : '0px'
    // Lying over the page (peek or drawer): a shadow separates it
    const floating = open && !(isWide && pinned)

    return (
        <div style={{ width: space }} className={`relative z-20 shrink-0 transition-[width] ${ANIMATE}`}>
            {!isWide && (
                <div
                    aria-hidden
                    onClick={closeDrawer}
                    className={`fixed inset-0 bg-overlay transition-opacity ${ANIMATE} ${drawerOpen ? '' : 'pointer-events-none opacity-0'}`}
                />
            )}
            <nav
                id="sidebar"
                aria-label="Main"
                inert={!open && !isWide}
                {...peek.handlers}
                style={{ width, '--tree-compact-duration': 'var(--sidebar-duration)' } as CSSProperties}
                className={`absolute inset-y-0 start-0 overflow-hidden bg-surface transition-[width,box-shadow] ${ANIMATE} ${floating ? 'shadow-xl' : ''}`}
            >
                <div style={{ paddingInline: PX }} className="h-full w-(--sidebar-w) overflow-y-auto py-(--sidebar-py)">
                    <SidebarTree compact={!open} />
                </div>
            </nav>
        </div>
    )
}
