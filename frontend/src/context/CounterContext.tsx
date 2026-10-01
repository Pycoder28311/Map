import { createContext, useContext, useState, type ReactNode } from 'react'

type CounterContextType = {
    count: number
    increment: () => void
}

const CounterContext = createContext<CounterContextType | null>(null)

export function CounterProvider({ children }: { children: ReactNode }) {
    const [count, setCount] = useState(0)
    const increment = () => setCount((c) => c + 1)

    return (
        <CounterContext.Provider value={{ count, increment }}>
            {children}
        </CounterContext.Provider>
    )
}

export function useCounter() {
    const ctx = useContext(CounterContext)
    if (!ctx) throw new Error('useCounter must be used inside <CounterProvider>')
    return ctx
}
