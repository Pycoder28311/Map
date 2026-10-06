import { LuBell, LuMenu } from 'react-icons/lu'
import { Link } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import BarPopout from '../ui/overlays/BarPopout'
import Button from '../ui/buttons/Button'

/** Top bar: toggles the sidebar (state in AppContext) and links home */
export default function Navbar() {
    const { sidebarOpen, toggleSidebar } = useApp()

    return (
        <header className="flex h-14 items-center gap-2 bg-surface px-2">
            <Button
                variant="ghost"
                icon={LuMenu}
                onClick={toggleSidebar}
                aria-expanded={sidebarOpen}
                aria-controls="sidebar"
            >
                Menu
            </Button>
            <Link to="/" className="text-heading font-semibold">
                Map
            </Link>
            <BarPopout trigger={<Button variant="ghost" icon={LuBell}>Updates</Button>} align="end" className="ml-auto">
                <p className="w-56 text-body text-fg-muted">No new updates.</p>
            </BarPopout>
        </header>
    )
}
