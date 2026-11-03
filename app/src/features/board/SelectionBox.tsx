import type { PointerEvent } from 'react'
import IconButton from '../../components/ui/buttons/IconButton'
import HoverInfo from '../../components/ui/overlays/HoverInfo'
import type { Rect } from './bounds'
import { isEdgeHandle, type BoxHandle } from './operations'
import { BUTTON_SIZE, buttonCentre, handlePlace, type BoxAction, type BoxButton } from './selectionButtons'
import { boardToScreen, type Viewport } from './viewport'

/** The box is never smaller than this on screen (px), so its buttons have room */
const MIN_BOX = 40
/** The box's dashed line (px: border-2) */
const LINE = 2
/** The area that takes the pointer round a point (px), bigger than the point so it is easy to catch */
const HANDLE_AREA = 18
/** How far outside the box (px) the pointer turns it, and shows the rotate icon */
const ROTATE_BAND = 14
/** The rotate icon's lines: a bow with an arrow at each end */
const ROTATE_LINES = '<path d="M5 18C5 10.8 10.8 5 18 5"/><path d="M14 1.5 18 5l-4 3.5"/><path d="M1.5 14 5 18l3.5-4"/>'
/** The rotate icon, as the pointer: light with a dark edge, so it reads on any map */
const ROTATE_ICON = encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round">' +
    `<g stroke="#111827" stroke-width="4">${ROTATE_LINES}</g><g stroke="#ffffff" stroke-width="2">${ROTATE_LINES}</g>` +
    '</svg>',
)
const ROTATE_CURSOR = `url("data:image/svg+xml,${ROTATE_ICON}") 12 12, grab`

const CURSOR: Record<BoxHandle, string> = {
  tl: 'cursor-nwse-resize',
  br: 'cursor-nwse-resize',
  tr: 'cursor-nesw-resize',
  bl: 'cursor-nesw-resize',
  t: 'cursor-ns-resize',
  b: 'cursor-ns-resize',
  l: 'cursor-ew-resize',
  r: 'cursor-ew-resize',
}

/** What a point's hover card says */
function infoOf(handle: BoxHandle): { title: string; text: string } {
  if (handle === 'l' || handle === 'r') return { title: 'Width', text: 'Drag to change only the width. Nothing turns.' }
  if (isEdgeHandle(handle)) return { title: 'Height', text: 'Drag to change only the height. Nothing turns.' }
  return { title: 'Resize', text: 'Drag to change the size and turn it at the same time, about the opposite corner. Shift turns in steps of 15°. Alt changes the size to any ratio without turning.' }
}

type Props = {
  /** What the box is around (board units), as it is now (during a gesture: as previewed) */
  bounds: Rect
  view: Viewport
  buttons: BoxButton[]
  /** The points dragged on the box */
  handles: BoxHandle[]
  onAction: (action: BoxAction) => void
  /** A point is pressed: it starts a gesture */
  onHandle: (handle: BoxHandle, e: PointerEvent) => void
  /** Pressed just outside the box: it starts turning (for what has points: what has a size) */
  onRotate: (e: PointerEvent) => void
}

/** The dashed rectangle around the selection, its points and its buttons. It never turns: it fits what is inside (map.md) */
export default function SelectionBox({ bounds, view, buttons, handles, onAction, onHandle, onRotate }: Props) {
  const topLeft = boardToScreen(view, { x: bounds.x, y: bounds.y })
  const w = Math.max(bounds.w * view.scale, MIN_BOX)
  const h = Math.max(bounds.h * view.scale, MIN_BOX)
  // A box smaller than the minimum grows around its middle
  const left = topLeft.x - (w - bounds.w * view.scale) / 2
  const top = topLeft.y - (h - bounds.h * view.scale) / 2
  // The four strips just outside the dashed line (its children start inside it), corners included
  const bands =
    handles.length === 0
      ? []
      : [
          { left: -LINE - ROTATE_BAND, top: -LINE - ROTATE_BAND, width: w + 2 * ROTATE_BAND, height: ROTATE_BAND },
          { left: -LINE - ROTATE_BAND, top: h - LINE, width: w + 2 * ROTATE_BAND, height: ROTATE_BAND },
          { left: -LINE - ROTATE_BAND, top: -LINE, width: ROTATE_BAND, height: h },
          { left: w - LINE, top: -LINE, width: ROTATE_BAND, height: h },
        ]

  return (
    <div className="pointer-events-none absolute inset-0 overflow-visible" data-no-drag>
      <div style={{ left, top, width: w, height: h }} className="absolute border-2 border-dashed border-blue-500">
        {bands.map((band, i) => (
          <span
            key={i}
            aria-hidden
            data-rotate-band
            style={{ ...band, cursor: ROTATE_CURSOR }}
            onPointerDown={(e) => {
              if (e.button !== 0) return
              e.preventDefault()
              e.stopPropagation()
              // Keeps the rotate icon while the pointer goes where it likes
              e.currentTarget.setPointerCapture(e.pointerId)
              onRotate(e)
            }}
            className="pointer-events-auto absolute touch-none"
          />
        ))}
        {handles.map((handle) => {
          const place = handlePlace(handle)
          const info = infoOf(handle)
          return (
            // Centred on the dashed line (its children start inside it)
            <span
              key={handle}
              style={{ left: place.x * (w - LINE) - LINE / 2 - HANDLE_AREA / 2, top: place.y * (h - LINE) - LINE / 2 - HANDLE_AREA / 2, width: HANDLE_AREA, height: HANDLE_AREA }}
              className="pointer-events-auto absolute"
            >
              <HoverInfo title={info.title} text={info.text} side="top">
                <span
                  aria-label={info.title}
                  onPointerDown={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    onHandle(handle, e)
                  }}
                  className={`flex size-full touch-none items-center justify-center ${CURSOR[handle]}`}
                >
                  <span aria-hidden className="size-2.5 rounded-full border-2 border-blue-500 bg-white shadow-sm" />
                </span>
              </HoverInfo>
            </span>
          )
        })}
        {buttons.map((b) => {
          const c = buttonCentre(b.corner, w, h)
          return (
            // Faint until hovered or focused, as the Import image button is
            <span key={b.action} style={{ left: c.x - BUTTON_SIZE / 2, top: c.y - BUTTON_SIZE / 2, width: BUTTON_SIZE, height: BUTTON_SIZE }} className="pointer-events-auto absolute opacity-70 transition-opacity duration-200 hover:opacity-100 has-[:focus-visible]:opacity-100 motion-reduce:transition-none">
              <HoverInfo title={b.label} text={b.info} shortcut={b.shortcut} side="top">
                <IconButton
                  icon={b.icon}
                  label={b.label}
                  // The same as every other icon button, with its background on so it reads over the map
                  variant="ghost"
                  filled
                  size="sm"
                  // The icon takes most of the square, in its middle (no padding of the button's own to push it). An icon button's icon is sized on the icon itself
                  className="size-full justify-center [--btn-pad-y:0px]! [&>svg]:size-4.5!"
                  onClick={() => onAction(b.action)}
                />
              </HoverInfo>
            </span>
          )
        })}
      </div>
    </div>
  )
}
