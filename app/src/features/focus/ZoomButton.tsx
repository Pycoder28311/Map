import { useRef } from 'react'
import { createPortal } from 'react-dom'
import { LuZoomIn, LuZoomOut } from 'react-icons/lu'
import IconButton from '../../components/ui/buttons/IconButton'
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
      <IconButton
        ref={ref}
        icon={LuZoomIn}
        bigIcon
        label="Focus: hide the navbar and sidebar"
        onClick={() => ref.current && turnOn(ref.current.getBoundingClientRect())}
      />
      {on &&
        at &&
        createPortal(
          <IconButton
            icon={LuZoomOut}
            bigIcon
            label="Leave focus: show the navbar and sidebar (Esc)"
            variant="secondary"
            onClick={turnOff}
            style={{ left: at.left, top: at.top, width: at.width, height: at.height }}
            className="fixed z-40"
          />,
          document.body,
        )}
    </>
  )
}
