import { useRef, type CSSProperties } from 'react'
import { useDragSurface } from '../../../features/drag/surfaces'
import { useFocusMode } from '../../../features/focus/FocusMode'
import LiftedRow from '../../ui/tree/LiftedRow'
import SidebarDropProvider from './SidebarDrop'
import SidebarTree from './SidebarTree'
import TrashBin from './TrashBin'
import { useHoverIntent } from './useHoverIntent'
import { useSidebar } from './useSidebar'

// Hover on the rail: open after resting this long, close this long after leaving (ms)
const PEEK_OPEN_DELAY = 200
const PEEK_CLOSE_DELAY = 150

const FULL = 'var(--sidebar-w)'
const RAIL = 'var(--sidebar-rail)'
// A dragged object over the sidebar looks like one of its rows: as wide as the sidebar's content
// (its width minus the padding on both sides: PX below, twice)
const ROW_W = 'w-[calc(var(--sidebar-w)-var(--sidebar-rail)+2*var(--btn-px)+var(--btn-icon-size)+2*var(--btn-close-p))]'

// Sidebar padding left/right that centers a top-level row in the rail: what's left of the rail
// after a compact row (its icon's box + its padding on both sides), split on both sides
const PX = 'calc((var(--sidebar-rail) - 2 * var(--btn-px) - var(--btn-icon-size) - 2 * var(--btn-close-p)) / 2)'
const ANIMATE = 'duration-(--sidebar-duration) ease-out motion-reduce:transition-none'
// A rail row's width (its icon's box + the row padding): the short lines in the rail end there
const RAIL_LINE_W = 'w-[calc(2*var(--btn-px)+var(--btn-icon-size)+2*var(--btn-close-p))]'

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
    const navRef = useRef<HTMLElement>(null)
    // Over the sidebar, a dragged object (from anywhere) floats as a lifted sidebar row
    useDragSurface('sidebar', navRef, (item) => <LiftedRow label={item.label} icon={item.icon} origin={item.grab} className={ROW_W} />)
    const { isWide, pinned, drawerOpen, closeDrawer } = useSidebar()
    const peek = useHoverIntent({ enabled: isWide && !pinned, openDelay: PEEK_OPEN_DELAY, closeDelay: PEEK_CLOSE_DELAY })

    // Focus mode (the navbar's Zoom): slid away entirely
    const { on: hidden } = useFocusMode()
    const space = hidden ? '0px' : isWide ? (pinned ? FULL : RAIL) : '0px'
    const open = !hidden && (isWide ? pinned || peek.open : drawerOpen)
    const width = hidden ? '0px' : open ? FULL : isWide ? RAIL : '0px'
    // Lying over the page (peek or drawer): a shadow separates it
    const floating = open && !(isWide && pinned)

    return (
        // data-popout-edge: bar popouts near it stick to its right edge (ui/overlays/BarPopout)
        <div data-popout-edge="start" style={{ width: space }} className={`relative z-20 shrink-0 transition-[width] ${ANIMATE}`}>
            {!isWide && (
                <div
                    aria-hidden
                    onClick={closeDrawer}
                    className={`fixed inset-0 bg-overlay transition-opacity ${ANIMATE} ${drawerOpen ? '' : 'pointer-events-none opacity-0'}`}
                />
            )}
            <nav
                ref={navRef}
                id="sidebar"
                aria-label="Main"
                inert={hidden || (!open && !isWide)}
                {...peek.handlers}
                style={{ width, '--tree-compact-duration': 'var(--sidebar-duration)' } as CSSProperties}
                className={`absolute inset-y-0 start-0 overflow-hidden bg-surface transition-[width,box-shadow] ${ANIMATE} ${floating ? 'shadow-xl' : ''}`}
            >
                {/* The sections scroll; the trash bin stays at the bottom. Drops on rows and the bin: SidebarDrop */}
                <SidebarDropProvider>
                    <div style={{ paddingInline: PX }} className="flex h-full w-(--sidebar-w) flex-col py-(--sidebar-py)">
                        {/* Never scrolls sideways (e.g. while a dragged object is over it): what sticks out is cut, and
                            a sideways scroll from code (the drag's auto-scroll) is undone at once */}
                        <div
                            onScroll={(e) => {
                                if (e.currentTarget.scrollLeft !== 0) e.currentTarget.scrollLeft = 0
                            }}
                            className="-mx-1 min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-1"
                        >
                            <SidebarTree compact={!open} />
                        </div>
                        <div className="shrink-0 pt-(--divider-gap)">
                            {/* The line above the bin: full width, or in the rail as short as the dividers' (Divider) */}
                            <div
                                aria-hidden
                                className={`mb-(--divider-gap) h-px bg-line transition-[width] ${ANIMATE} ${open ? 'w-full' : RAIL_LINE_W}`}
                            />
                            <TrashBin compact={!open} />
                        </div>
                    </div>
                </SidebarDropProvider>
            </nav>
        </div>
    )
}
