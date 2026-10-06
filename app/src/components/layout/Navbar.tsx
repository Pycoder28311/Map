import { LuMenu } from 'react-icons/lu'
import { Link } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import Button from '../ui/Button'

/** Top bar: toggles the sidebar (state in AppContext) and links home */
export default function Navbar() {
    const { sidebarOpen, toggleSidebar } = useApp()

    return (
        <header className="flex h-14 items-center gap-2 border-b border-gray-200 bg-white px-2">
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
        </header>
    )
}
