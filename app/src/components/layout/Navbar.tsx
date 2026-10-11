import { LuBell } from 'react-icons/lu'
import { Link } from 'react-router-dom'
import BarPopout from '../ui/overlays/BarPopout'
import Button from '../ui/buttons/Button'
import { iconButtonClass } from '../ui/buttons/buttonStyles'
import MenuToggleIcon from '../ui/icons/MenuToggleIcon'
import { useSidebar } from './sidebar/useSidebar'

/**
 * Top bar: ☰ pins/unpins the sidebar (opens/closes it on narrow screens; sidebar/useSidebar.ts) and
 * turns into an ✕ while it's open; links home
 */
export default function Navbar() {
    const sidebar = useSidebar()

    return (
        <header className="flex h-14 items-center gap-2 bg-surface px-2">
            {/* As tall as the "Map" next to it */}
            <button
                type="button"
                onClick={sidebar.toggle}
                aria-expanded={sidebar.expanded}
                aria-controls="sidebar"
                aria-label={sidebar.expanded ? 'Close menu' : 'Open menu'}
                title={sidebar.expanded ? 'Close menu' : 'Open menu'}
                className={iconButtonClass('ghost')}
            >
                <MenuToggleIcon open={sidebar.expanded} className="size-6" />
            </button>
            <Link to="/" className="text-heading font-semibold">
                Map
            </Link>
            <BarPopout trigger={<Button variant="ghost" icon={LuBell}>Updates</Button>} align="end" className="ml-auto">
                <p className="w-56 text-body text-fg-muted">No new updates.</p>
            </BarPopout>
        </header>
    )
}
