import type { PointerEvent } from 'react'
import IconButton from '../../components/ui/buttons/IconButton'
import HoverInfo from '../../components/ui/overlays/HoverInfo'
import type { Rect } from './bounds'
import { boardToScreen, type Viewport } from './viewport'
import { BUTTON_SIZE, buttonCentre, type BoxAction, type BoxButton } from './selectionButtons'

/** The box is never smaller than this on screen (px), so its buttons have room */
const MIN_BOX = 40

type Props = {
  /** What the box is around (board units), as it is now (during a gesture: as previewed) */
  bounds: Rect
  view: Viewport
  buttons: BoxButton[]
  /** Split mode is on (its button shows pressed) */
  splitting: boolean
  /** Buttons that cannot be used now, e.g. split on a selection that has no line */
  disabled?: BoxAction[]
  onAction: (action: BoxAction) => void
  /** The resize handle is dragged (it also turns): it starts a gesture instead of clicking */
  onHandle: (action: 'resize', e: PointerEvent) => void
}

/** The dashed rectangle around the selection and its buttons. It never turns: it fits what is inside (map.md) */
export default function SelectionBox({ bounds, view, buttons, splitting, disabled = [], onAction, onHandle }: Props) {
  const topLeft = boardToScreen(view, { x: bounds.x, y: bounds.y })
  const w = Math.max(bounds.w * view.scale, MIN_BOX)
  const h = Math.max(bounds.h * view.scale, MIN_BOX)
  // A box smaller than the minimum grows around its middle
  const left = topLeft.x - (w - bounds.w * view.scale) / 2
  const top = topLeft.y - (h - bounds.h * view.scale) / 2

  return (
    <div className="pointer-events-none absolute inset-0 overflow-visible" data-no-drag>
      <div style={{ left, top, width: w, height: h }} className="absolute border-2 border-dashed border-blue-500">
        {buttons.map((b) => {
          const c = buttonCentre(b.corner, b.order, w, h)
          const handle = b.action === 'resize'
          return (
            <span key={b.action} style={{ left: c.x - BUTTON_SIZE / 2, top: c.y - BUTTON_SIZE / 2, width: BUTTON_SIZE, height: BUTTON_SIZE }} className="pointer-events-auto absolute">
              <HoverInfo title={b.label} text={b.info} shortcut={b.shortcut} side="top">
                <IconButton
                  icon={b.icon}
                  label={b.label}
                  variant={b.action === 'split' && splitting ? 'primary' : 'secondary'}
                  aria-pressed={b.action === 'split' ? splitting : undefined}
                  disabled={disabled.includes(b.action)}
                  size="sm"
                  className={`size-full ${handle ? 'cursor-nwse-resize touch-none' : ''}`}
                  onPointerDown={handle ? (e) => { e.preventDefault(); e.stopPropagation(); onHandle('resize', e) } : undefined}
                  onClick={handle ? undefined : () => onAction(b.action)}
                />
              </HoverInfo>
            </span>
          )
        })}
      </div>
    </div>
  )
}
