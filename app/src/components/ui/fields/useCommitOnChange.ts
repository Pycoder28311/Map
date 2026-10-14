import { useEffect, useRef, type RefObject } from 'react'

/**
 * Calls `commit(value)` when the browser's own `change` event comes: for a slider when it is released, for a colour
 * picker when it closes. (React's onChange is every `input` event, so it is for the live value only.)
 */
export function useCommitOnChange(ref: RefObject<HTMLInputElement | null>, commit: (value: string) => void) {
  const latest = useRef(commit)
  useEffect(() => {
    latest.current = commit
  })
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const onChange = () => latest.current(el.value)
    el.addEventListener('change', onChange)
    return () => el.removeEventListener('change', onChange)
  }, [ref])
}
