import { useLayoutEffect, useState } from 'react'

/** Whether an element is narrower than `width` (px), followed as it is resized */
export function useNarrower(el: HTMLElement | null, width: number) {
  const [narrow, setNarrow] = useState(false)
  useLayoutEffect(() => {
    if (!el) return
    const watcher = new ResizeObserver(([entry]) => setNarrow(entry.contentRect.width < width))
    watcher.observe(el)
    return () => watcher.disconnect()
  }, [el, width])
  return narrow
}
