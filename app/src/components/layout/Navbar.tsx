import { Link } from 'react-router-dom'
import ZoomButton from '../../features/focus/ZoomButton'
import RecentHistory from '../../features/recent/RecentHistory'
import NavSearch from '../../features/search/NavSearch'
import ShareButton from '../../features/share/ShareButton'
import PopoutLayer from '../ui/overlays/PopoutLayer'
import MenuToggleIcon from '../ui/icons/MenuToggleIcon'
import ProfileCircle from './ProfileCircle'
import { frameRadiusPx } from '../../features/workspace/paneStyles'
import { useWorkspace } from '../../features/workspace/useWorkspace'
import { useSidebar } from './sidebar/useSidebar'

// Full class strings so Tailwind can detect them at build time.
// The ☰ button: just the icon, as big as a rail row's square (its icon's box + the row padding, like
// the sidebar's rows when it's closed), centred over the rail like them (minus the bar's px-2)
const MENU_BUTTON =
    'inline-flex size-[calc(2*var(--btn-px)+var(--btn-icon-size)+2*var(--btn-close-p))] shrink-0 items-center justify-center ' +
    'ms-[calc((var(--sidebar-rail)-2*var(--btn-px)-var(--btn-icon-size)-2*var(--btn-close-p))/2-0.5rem)] ' +
    'rounded-(--btn-radius) cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'

/**
 * Top bar:
 * - left: ☰ pins/unpins the sidebar (opens/closes it on narrow screens; sidebar/useSidebar.ts) and
 *   turns into an ✕ while it's open; links home
 * - centre: Recent History
 * - right: Search, Share, the profile circle, Zoom (focus mode)
 * Their popouts grow out of the bar's bottom edge in one layer (PopoutLayer), so Search's and Share's
 * join into one shape when both are open.
 */
export default function Navbar() {
    const sidebar = useSidebar()
    const { onWorkspace, count } = useWorkspace()
    const panes = onWorkspace && count > 1

    return (
        // As tall as the rail is wide: the ☰ (centred over the rail) is as far from the top as from the left
        <header className="relative flex h-(--sidebar-rail) items-center gap-2 bg-surface px-2">
            {/* Its shadow, and its popouts'; the page's top corners are rounded under it while panes show */}
            <PopoutLayer barHeight="var(--sidebar-rail)" corners={panes ? frameRadiusPx() : 0}>
                {/* As big as a sidebar row in the rail, right above them; no background */}
                <button
                    type="button"
                    onClick={sidebar.toggle}
                    aria-expanded={sidebar.expanded}
                    aria-controls="sidebar"
                    aria-label={sidebar.expanded ? 'Close menu' : 'Open menu'}
                    title={sidebar.expanded ? 'Close menu' : 'Open menu'}
                    className={MENU_BUTTON}
                >
                    <MenuToggleIcon open={sidebar.expanded} className="size-full" />
                </button>
                <Link to="/" className="text-heading font-semibold">
                    Map
                </Link>

                {/* Centred in the bar, whatever the sides hold */}
                <div className="absolute inset-y-0 left-1/2 flex -translate-x-1/2">
                    <RecentHistory />
                </div>

                <div className="ms-auto flex h-full items-center gap-4">
                    <NavSearch />
                    <ShareButton />
                    <ProfileCircle />
                    <ZoomButton />
                </div>
            </PopoutLayer>
        </header>
    )
}
