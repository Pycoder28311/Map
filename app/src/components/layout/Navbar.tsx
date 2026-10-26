import { Link } from 'react-router-dom'
import ZoomButton from '../../features/focus/ZoomButton'
import RecentHistory from '../../features/recent/RecentHistory'
import NavSearch from '../../features/search/NavSearch'
import ShareButton from '../../features/share/ShareButton'
import PopoutLayer from '../ui/overlays/PopoutLayer'
import GlobeLogo from '../ui/icons/GlobeLogo'
import MenuToggleIcon from '../ui/icons/MenuToggleIcon'
import DeskStrip from '../ui/icons/DeskStrip'
import ProfileCircle from './ProfileCircle'
import { frameRadiusPx } from '../../features/workspace/paneStyles'
import { useWorkspace } from '../../features/workspace/useWorkspace'
import { useSidebar } from './sidebar/useSidebar'
import IconButton from '../ui/buttons/IconButton'

// Full class strings so Tailwind can detect them at build time.
// The ☰ button: centred over the sidebar's rail, like the closed sidebar's rows (minus the bar's px-2); 31px: the
// square Shade button's size (styles/buttons.css)
const MENU_BUTTON = 'shrink-0 ms-[calc((var(--sidebar-rail)-31px)/2-0.5rem)]'

/**
 * Top bar:
 * - left: ☰ pins/unpins the sidebar (opens/closes it on narrow screens; sidebar/useSidebar.ts) and
 *   turns into an ✕ while it's open; links home
 * - centre: Recent History
 * - right: Search, Share, the profile circle, Zoom (focus mode), over a faint pixel desk of its own
 * Their popouts grow out of the bar's bottom edge in one layer (PopoutLayer), so Search's and Share's
 * join into one shape when both are open.
 */
export default function Navbar() {
    const sidebar = useSidebar()
    const { onWorkspace, count } = useWorkspace()
    const panes = onWorkspace && count > 1

    return (
        // As tall as the rail is wide: the ☰ (centred over the rail) is as far from the top as from the left
        <header className="relative flex h-(--sidebar-rail) items-center gap-2 bg-surface [background-image:var(--chrome-texture)] px-base">
            {/* Its shadow, and its popouts'; the page's top corners are rounded under it while panes show */}
            <PopoutLayer barHeight="var(--sidebar-rail)" corners={panes ? frameRadiusPx() : 0}>
                {/* As big as a sidebar row in the rail, right above them; no background */}
                <IconButton
                    onClick={sidebar.toggle}
                    aria-expanded={sidebar.expanded}
                    aria-controls="sidebar"
                    label={sidebar.expanded ? 'Close menu' : 'Open menu'}
                    className={MENU_BUTTON}
                >
                    <MenuToggleIcon open={sidebar.expanded} />
                </IconButton>
                {/* The name, and a faint pixel desk behind it that reaches towards the Recent button (centred, 14rem wide: 8rem from the centre
                    keeps a gap) and fills the bar's height; on narrow screens only the name */}
                <div className="flex h-full min-w-0 items-center gap-2 lg:w-[calc(50%-8rem-var(--sidebar-rail))]">
                    <Link to="/dashboard" className="inline-flex shrink-0 items-center gap-2 text-heading font-semibold">
                        <GlobeLogo className="h-11 w-auto shrink-0" />
                        Map
                    </Link>
                    <DeskStrip className="h-full min-w-0 flex-1 max-lg:hidden" />
                </div>

                {/* Centred in the bar, whatever the sides hold */}
                <div className="absolute inset-y-0 left-1/2 flex -translate-x-1/2">
                    <RecentHistory />
                </div>

                {/* The right side's faint pixel desk (a book, a map, dividers, a potion and stars), from the Recent button's gap to the bar's end,
                    behind the buttons (they are positioned, so they paint over it); on narrow screens none */}
                <DeskStrip side="right" className="absolute inset-y-0 right-0 left-[calc(50%+7rem)] max-lg:hidden" />

                <div className="relative ms-auto flex h-full items-center gap-4">
                    <NavSearch />
                    <ShareButton />
                    <ProfileCircle />
                    <ZoomButton />
                </div>
            </PopoutLayer>
        </header>
    )
}
