import { useRef } from 'react'
import { createPortal } from 'react-dom'
import { LuZoomIn, LuZoomOut } from 'react-icons/lu'
import { iconButtonClass } from '../../components/ui/buttons/buttonStyles'
import { useFocusMode } from './FocusMode'

/**
 * Zoom (the navbar's last button): focus mode hides the navbar and the sidebar, so the page fills the
 * window. The button itself stays where it was, floating with a shadow over the page; click it (or
 * Esc) to bring them back.
 */
export default function ZoomButton() {
  const { on, at, turnOn, turnOff } = useFocusMode()
  const ref = useRef<HTMLButtonElement>(null)

  return (
    <>
      <button
        ref={ref}
        type="button"
        onClick={() => ref.current && turnOn(ref.current.getBoundingClientRect())}
        aria-label="Focus: hide the navbar and sidebar"
        title="Focus"
        className={iconButtonClass('ghost', 'size-9 justify-center')}
      >
        <LuZoomIn className="size-5" />
      </button>
      {on &&
        at &&
        createPortal(
          <button
            type="button"
            onClick={turnOff}
            aria-label="Leave focus: show the navbar and sidebar"
            title="Leave focus (Esc)"
            style={{ left: at.left, top: at.top, width: at.width, height: at.height }}
            className={iconButtonClass('ghost', 'fixed z-40 justify-center bg-surface shadow-lg ring-1 ring-line')}
          >
            <LuZoomOut className="size-5" />
          </button>,
          document.body,
        )}
    </>
  )
}
