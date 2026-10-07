import { useCallback, useEffect, useRef } from 'react'

/**
 * One pending timeout at a time: `set` replaces the previous one, `clear` cancels it, and unmounting
 * cancels it too (so it never fires on an unmounted component).
 */
export function useTimeout() {
  const id = useRef<number>(undefined)

  const clear = useCallback(() => window.clearTimeout(id.current), [])
  const set = useCallback(
    (fn: () => void, ms: number) => {
      clear()
      id.current = window.setTimeout(fn, ms)
    },
    [clear],
  )

  useEffect(() => clear, [clear])
  return { set, clear }
}
