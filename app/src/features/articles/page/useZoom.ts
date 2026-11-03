import { useEffect, useLayoutEffect, useState } from 'react'

/** Zoom: the page goes to the top layer, over the panes, the sidebar and the navbar (they stay as they are under it); Esc leaves it */
export function useZoom(page: HTMLElement | null) {
  const [zoomed, setZoomed] = useState(false)
  useLayoutEffect(() => {
    if (!page) return
    if (zoomed && !page.matches(':popover-open')) page.showPopover()
  }, [page, zoomed])
  useEffect(() => {
    if (!zoomed) return
    const onKey = (e: KeyboardEvent) => {
      // Not when a menu, a popout or a modal has the Esc
      if (e.key === 'Escape' && !e.defaultPrevented && !document.querySelector('dialog[open]')) setZoomed(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [zoomed])
  return [zoomed, setZoomed] as const
}
