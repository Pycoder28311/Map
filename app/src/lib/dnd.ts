// Shared drag & drop helpers on top of dnd-kit (not tied to any feature).
import { PointerSensor, type DragMoveEvent, type Modifier, type PointerSensorOptions } from '@dnd-kit/core'
import type { PointerEvent } from 'react'

/** What a drag never starts from: things that use the pointer themselves. Mark more with data-no-drag */
const INTERACTIVE =
  'a, button, input, textarea, select, label, summary, video, audio, canvas, iframe, ' +
  '[contenteditable=""], [contenteditable="true"], [role="button"], [role="link"], [role="slider"], ' +
  '[role="textbox"], [role="scrollbar"], [data-no-drag]'

/**
 * Whether a press can start a drag of `owner` (the element with the drag listeners): only on its
 * "background", i.e. with nothing interactive between the pressed element and the owner. An element
 * marked data-drag-handle (e.g. a grip button) always can.
 */
export function startsOnBackground(target: EventTarget | null, owner: Element): boolean {
  for (let el = target instanceof Element ? target : null; el && el !== owner; el = el.parentElement) {
    if (el.matches('[data-drag-handle]')) return true
    if (el.matches(INTERACTIVE)) return false
  }
  return true
}

/**
 * PointerSensor that lets a large element (e.g. a whole panel) be dragged from its background, while
 * its buttons, links, fields and canvases (e.g. a map) keep the pointer for themselves.
 */
export class BackgroundPointerSensor extends PointerSensor {
  static activators = [
    {
      eventName: 'onPointerDown' as const,
      handler: (event: PointerEvent, options: PointerSensorOptions) =>
        startsOnBackground(event.nativeEvent.target, event.currentTarget) &&
        PointerSensor.activators[0].handler(event, options),
    },
  ]
}

/** How far from the pointer the dragged item's corner sits (px), so it doesn't hide what's under it */
const POINTER_OFFSET = 12

/**
 * DragOverlay modifier: the overlay follows the pointer, its top-left corner just past it, wherever
 * the drag was grabbed (dnd-kit otherwise keeps it where the dragged node was). Keyboard drags: unchanged.
 */
export const followPointer: Modifier = ({ activatorEvent, draggingNodeRect, transform }) => {
  if (!draggingNodeRect || !(activatorEvent instanceof MouseEvent)) return transform
  return {
    ...transform,
    x: transform.x + activatorEvent.clientX - draggingNodeRect.left + POINTER_OFFSET,
    y: transform.y + activatorEvent.clientY - draggingNodeRect.top + POINTER_OFFSET,
  }
}

/**
 * Where the pointer is during a drag (viewport px): where it was pressed + how far it moved. Keyboard
 * drags (no pointer): the centre of the dragged node.
 */
export function dragPoint(e: DragMoveEvent): { x: number; y: number } | null {
  if (e.activatorEvent instanceof MouseEvent) {
    return { x: e.activatorEvent.clientX + e.delta.x, y: e.activatorEvent.clientY + e.delta.y }
  }
  const rect = e.active.rect.current.translated
  return rect ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 } : null
}
