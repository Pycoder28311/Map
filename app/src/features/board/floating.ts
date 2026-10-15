import { useSidebar } from '../../components/layout/sidebar/useSidebar'

/** The look of the editor's floating pieces (name bar, tool panel, zoom control) */
export const FLOAT = 'rounded-(--card-radius) border border-line bg-surface shadow-lg'

/** The two big top bars (title bar, tool panel): rounder corners, for them and their buttons (set as the theme's variables, so what hangs under them follows) */
export const ROUNDER = '[--card-radius:1.5rem] [--btn-radius:1rem] [--btn-close-radius:1rem]'

// Full class strings so Tailwind can detect them at build time
const SHIFT = 'transition-transform duration-(--sidebar-duration) ease-out motion-reduce:transition-none'
const SHIFTED = 'translate-x-[calc(var(--sidebar-w)-var(--sidebar-rail))]'

/**
 * Classes that slide a left-hand floating piece right while the sidebar's rail is open over the page (hover peek).
 * Pinned, the page itself narrows, so nothing more is needed; a drawer (narrow screens) dims the page instead.
 */
export function usePeekShift() {
  const { isWide, pinned, peeking } = useSidebar()
  return `${SHIFT} ${isWide && !pinned && peeking ? SHIFTED : ''}`
}

/** The width (px) of the editor's right sidebar (SidePanel's w-80): the Create button keeps this far from the page's edge while it is open */
export const SIDE_PANEL_PX = 320
