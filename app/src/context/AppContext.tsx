import { createContext, useContext, useState, type ReactNode } from 'react'

/** App-wide state shared by pages and global elements (the sidebar's own: layout/sidebar/useSidebar.ts) */
type AppContextType = {
    count: number
    increment: () => void
}

const AppContext = createContext<AppContextType | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
    const [count, setCount] = useState(0)

    const increment = () => setCount((c) => c + 1)

    return (
        <AppContext.Provider value={{ count, increment }}>
            {children}
        </AppContext.Provider>
    )
}

export function useApp() {
    const ctx = useContext(AppContext)
    if (!ctx) throw new Error('useApp must be used inside <AppProvider>')
    return ctx
}
