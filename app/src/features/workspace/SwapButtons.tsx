import type { CSSProperties } from 'react'
import { LuArrowLeftRight, LuArrowUpDown } from 'react-icons/lu'
import IconButton from '../../components/ui/buttons/IconButton'
import { borders, type Slot, type Template } from './layout'

type Props = {
  template: Template
  /** The two panels on its sides trade places */
  onSwap: (a: Slot, b: Slot) => void
}

// Full class strings so Tailwind can detect them at build time.
// Shown while its line is hovered or focused (the line is a `peer` before it, ResizeHandles), or
// while the pointer / keyboard focus is on the button itself. Wide screens only, like the lines.
const BUTTON =
  'absolute z-30 -translate-x-1/2 -translate-y-1/2 border border-line bg-surface-sunken shadow-md ' +
  'opacity-0 transition-opacity duration-150 hover:opacity-100 focus-visible:opacity-100 max-lg:hidden'
const SHOW = {
  x: 'peer-hover/x:opacity-100 peer-focus-visible/x:opacity-100',
  y: 'peer-hover/y:opacity-100 peer-focus-visible/y:opacity-100',
}
// Round, like the panels' island
const ROUND = { '--btn-close-radius': '9999px' } as CSSProperties

/** Where along the line the middle of a border is */
const MIDDLE = {
  start: 'calc(var(--split) / 2)',
  end: 'calc((var(--split) + 100%) / 2)',
  whole: '50%',
}

/**
 * A small button in the middle of each border between panels (borders in layout.ts), shown while
 * the border is hovered: the two panels on its sides trade places (the layout and sizes stay, so it
 * looks like their contents swap).
 */
export default function SwapButtons({ template, onSwap }: Props) {
  return borders(template).map(({ axis, part, slots }) => {
    // x line: runs down at --split-x, its halves split by --split-y (and the other way round)
    const along = MIDDLE[part].replace('--split', axis === 'x' ? '--split-y' : '--split-x')
    const position: CSSProperties =
      axis === 'x' ? { left: 'var(--split-x)', top: along } : { top: 'var(--split-y)', left: along }
    return (
      <IconButton
        key={`${axis}-${part}`}
        icon={axis === 'x' ? LuArrowLeftRight : LuArrowUpDown}
        label={axis === 'x' ? 'Swap left and right' : 'Swap top and bottom'}
        onClick={() => onSwap(...slots)}
        style={{ ...ROUND, ...position }}
        className={`${BUTTON} ${SHOW[axis]}`}
      />
    )
  })
}
