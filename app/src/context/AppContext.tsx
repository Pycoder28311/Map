import { createContext, useContext, useState, type ReactNode } from 'react'

/** App-wide state shared by pages and global elements (navbar, sidebar) */
type AppContextType = {
    count: number
    increment: () => void
    /** Sidebar visibility: toggled from the navbar, read by the sidebar */
    sidebarOpen: boolean
    toggleSidebar: () => void
}

const AppContext = createContext<AppContextType | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
    const [count, setCount] = useState(0)
    const [sidebarOpen, setSidebarOpen] = useState(true)

    const increment = () => setCount((c) => c + 1)
    const toggleSidebar = () => setSidebarOpen((open) => !open)

    return (
        <AppContext.Provider value={{ count, increment, sidebarOpen, toggleSidebar }}>
            {children}
        </AppContext.Provider>
    )
}

export function useApp() {
    const ctx = useContext(AppContext)
    if (!ctx) throw new Error('useApp must be used inside <AppProvider>')
    return ctx
}
