import type { DraggableAttributes } from '@dnd-kit/core'
import type { CSSProperties } from 'react'
import { LuGripHorizontal, LuMaximize2, LuUnlink } from 'react-icons/lu'
import IconButton from '../../components/ui/buttons/IconButton'

/**
 * The grip that drags the panel (from dnd-kit's useDraggable, in Pane): the dragged node and the
 * keyboard's activator. Its pointer presses reach the pane's listeners (data-drag-handle lets them start a drag).
 */
export type PaneGrip = {
  setRef: (el: HTMLElement | null) => void
  attributes: DraggableAttributes
}

type Props = {
  grip: PaneGrip
  onDetach: () => void
  onFullPage: () => void
}

// Its buttons are round, following the island's own round ends
const ROUND_BUTTONS = { '--btn-close-radius': '9999px' } as CSSProperties
// touch-none: on touch screens, dragging the grip moves the panel instead of scrolling the page
const GRIP = 'touch-none cursor-grab active:cursor-grabbing'

/**
 * A panel's actions in a small rounded bar floating at its top centre (like the iPhone's Dynamic
 * Island), over the content: the grip (drag it onto another panel), Detach, Full page.
 * Sizes: --island-* in styles/tokens.css
 */
export default function PaneIsland({ grip: { setRef, attributes }, onDetach, onFullPage }: Props) {
  return (
    <div
      style={ROUND_BUTTONS}
      className="absolute top-(--island-top) left-1/2 z-10 flex -translate-x-1/2 gap-(--island-gap) rounded-full border border-line bg-surface-sunken p-(--island-p) shadow-md"
    >
      <IconButton
        ref={setRef}
        icon={LuGripHorizontal}
        label="Move (drag onto another panel)"
        {...attributes}
        data-drag-handle
        className={GRIP}
      />
      <IconButton icon={LuUnlink} label="Detach" onClick={onDetach} />
      <IconButton icon={LuMaximize2} label="Full page" onClick={onFullPage} />
    </div>
  )
}
