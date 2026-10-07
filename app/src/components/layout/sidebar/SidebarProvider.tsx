import { useEffect, useState, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { useMediaQuery } from '../../../lib/useMediaQuery'
import { SidebarContext } from './useSidebar'

const KEY = 'sidebar:pinned'
// Tailwind's md: below it there's no room for a rail, so the sidebar becomes a drawer
const WIDE = '(min-width: 48rem)'

function loadPinned() {
    try {
        return localStorage.getItem(KEY) !== 'false'
    } catch {
        return true // unavailable storage: start pinned
    }
}

/** Holds the sidebar's state (useSidebar.ts); wraps the navbar and the sidebar */
export default function SidebarProvider({ children }: { children: ReactNode }) {
    const isWide = useMediaQuery(WIDE)
    const [pinned, setPinned] = useState(loadPinned)
    const { pathname } = useLocation()
    // The drawer remembers the page it was opened on, so following a link in it closes it
    const [drawerPage, setDrawerPage] = useState<string | null>(null)
    const drawerOpen = drawerPage === pathname
    const setDrawerOpen = (open: boolean) => setDrawerPage(open ? pathname : null)

    // It also closes on Escape
    useEffect(() => {
        if (!drawerOpen) return
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setDrawerPage(null)
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [drawerOpen])

    const toggle = () => {
        if (!isWide) return setDrawerOpen(!drawerOpen)
        const next = !pinned
        setPinned(next)
        try {
            localStorage.setItem(KEY, String(next))
        } catch {
            // private mode or full storage: it just isn't remembered
        }
    }

    return (
        <SidebarContext.Provider
            value={{
                isWide,
                pinned,
                drawerOpen,
                expanded: isWide ? pinned : drawerOpen,
                toggle,
                closeDrawer: () => setDrawerOpen(false),
            }}
        >
            {children}
        </SidebarContext.Provider>
    )
}
