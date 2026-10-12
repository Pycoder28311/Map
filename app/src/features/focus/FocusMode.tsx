import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

type FocusMode = {
  /** The navbar and sidebar are hidden; the page fills the window */
  on: boolean
  /** Where the Zoom button was when it was turned on (its floating copy stays there) */
  at: DOMRect | null
  turnOn: (at: DOMRect) => void
  turnOff: () => void
}

const FocusModeContext = createContext<FocusMode | null>(null)

export function useFocusMode(): FocusMode {
  const value = useContext(FocusModeContext)
  if (!value) throw new Error('useFocusMode must be used inside <FocusModeProvider>')
  return value
}

/** Focus mode (the navbar's Zoom): on/off for the whole frame (AppLayout); Esc turns it off */
export function FocusModeProvider({ children }: { children: ReactNode }) {
  const [at, setAt] = useState<DOMRect | null>(null)
  const on = at !== null

  useEffect(() => {
    if (!on) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !e.defaultPrevented) setAt(null)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [on])

  const value = useMemo(() => ({ on, at, turnOn: (rect: DOMRect) => setAt(rect), turnOff: () => setAt(null) }), [on, at])
  return <FocusModeContext.Provider value={value}>{children}</FocusModeContext.Provider>
}
