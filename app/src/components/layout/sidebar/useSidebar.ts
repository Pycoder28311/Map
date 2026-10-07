import { createContext, useContext } from 'react'

/**
 * The sidebar's state, shared by the navbar's ☰ button and the sidebar (SidebarProvider).
 * - wide screens: `pinned` = full width, pushing the page right; else the thin rail of icons, which
 *   opens over the page while hovered (Sidebar)
 * - narrow screens: no rail; ☰ opens it as a drawer over the page (`drawerOpen`)
 */
export type SidebarState = {
    /** Wide screen (rail + pinned); else narrow (drawer) */
    isWide: boolean
    /** Wide screens: full width (remembered across reloads) */
    pinned: boolean
    /** Narrow screens: open over the page (closes on navigation, Escape or a click outside) */
    drawerOpen: boolean
    /** Whether ☰ shows it as open (pinned or drawerOpen, by screen); for aria-expanded */
    expanded: boolean
    /** ☰: pin/unpin on wide screens, open/close the drawer on narrow ones */
    toggle: () => void
    closeDrawer: () => void
}

export const SidebarContext = createContext<SidebarState | null>(null)

export function useSidebar() {
    const ctx = useContext(SidebarContext)
    if (!ctx) throw new Error('useSidebar must be used inside <SidebarProvider>')
    return ctx
}
