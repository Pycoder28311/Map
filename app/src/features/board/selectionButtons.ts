// The buttons around the selection box (map.md): which, where, and what they say. Pure (selectionButtons.test.ts).
import { LuCopy, LuFlipHorizontal2, LuFlipVertical2, LuLink, LuMoveDiagonal2, LuRotateCw, LuSplit, LuTextCursorInput, LuX } from 'react-icons/lu'
import type { PlainIcon } from '../../components/ui/icons/IconSlot'
import type { BoardObject } from './types'

export type BoxAction = 'flipH' | 'flipV' | 'resize' | 'rotate' | 'split' | 'duplicate' | 'remove' | 'link' | 'description'

/**
 * Where on the box a button sits. Each corner's buttons run away from the box, so they never cover each other:
 * tl: left of the top-left corner · tr: right of the top-right corner · tru: above the top-right corner (a border's link)
 * br: below-right of the bottom-right corner · bl: below-left of the bottom-left corner · top: above the top edge's middle
 */
export type Corner = 'tl' | 'tr' | 'tru' | 'br' | 'bl' | 'top'

export type BoxButton = {
  action: BoxAction
  corner: Corner
  /** 0 is nearest the corner */
  order: number
  icon: PlainIcon
  label: string
  /** What the hover card says */
  info: string
  shortcut?: string
}

const BUTTON: Record<BoxAction, Omit<BoxButton, 'corner' | 'order'>> = {
  flipH: { action: 'flipH', icon: LuFlipHorizontal2, label: 'Flip horizontally', info: 'Mirror left and right.' },
  flipV: { action: 'flipV', icon: LuFlipVertical2, label: 'Flip vertically', info: 'Mirror top and bottom.' },
  resize: { action: 'resize', icon: LuMoveDiagonal2, label: 'Resize', info: 'Drag to change the size, to any ratio. Shift keeps the ratio.' },
  rotate: { action: 'rotate', icon: LuRotateCw, label: 'Rotate', info: 'Drag around the middle. Shift turns in steps of 15°.' },
  split: { action: 'split', icon: LuSplit, label: 'Split', info: 'Click it, then click the point of the line to cut it in two.', shortcut: 'Double-click' },
  duplicate: { action: 'duplicate', icon: LuCopy, label: 'Duplicate', info: 'Make a copy next to it.', shortcut: 'Ctrl+D' },
  remove: { action: 'remove', icon: LuX, label: 'Remove', info: 'Take it off the map. Undo brings it back.', shortcut: 'Delete' },
  description: { action: 'description', icon: LuTextCursorInput, label: 'Description', info: 'Add a description under the name of the area.' },
  link: { action: 'link', icon: LuLink, label: 'Link to other objects', info: 'Pick notes in the sidebar to link to it.' },
}

const at = (action: BoxAction, corner: Corner, order = 0): BoxButton => ({ ...BUTTON[action], corner, order })

/** The buttons for a selection (none for nothing selected) */
export function buttonsFor(selected: BoardObject[]): BoxButton[] {
  if (selected.length === 0) return []
  if (selected.length > 1) {
    return [at('flipH', 'tl'), at('flipV', 'tl', 1), at('resize', 'tr'), at('duplicate', 'tr', 1), at('remove', 'br'), at('rotate', 'top')]
  }
  switch (selected[0].kind) {
    case 'line':
      return [at('flipH', 'tl'), at('flipV', 'tl', 1), at('resize', 'tr'), at('split', 'tr', 1), at('duplicate', 'tr', 2), at('remove', 'br'), at('link', 'bl'), at('rotate', 'top')]
    case 'border':
      return [at('resize', 'tr'), at('split', 'tr', 1), at('link', 'tru'), at('remove', 'br'), at('description', 'bl'), at('rotate', 'top')]
    case 'shape':
      return [at('flipH', 'tl'), at('flipV', 'tl', 1), at('resize', 'tr'), at('duplicate', 'tr', 1), at('remove', 'br'), at('link', 'bl'), at('rotate', 'top')]
    case 'text':
      return [at('resize', 'tr'), at('duplicate', 'tr', 1), at('remove', 'br'), at('link', 'bl'), at('rotate', 'top')]
    case 'point':
      return [at('duplicate', 'tr'), at('remove', 'br'), at('link', 'bl')]
  }
}

/** Size of a box button and the space between them (px) */
export const BUTTON_SIZE = 28
const GAP = 4
/** How far a corner's first button is from the corner, along each axis (px) */
const OUT = 18

/** A button's centre, from the box's top-left corner (px), for a box `w` × `h` */
export function buttonCentre(corner: Corner, order: number, w: number, h: number): { x: number; y: number } {
  const step = (BUTTON_SIZE + GAP) * order
  switch (corner) {
    case 'tl':
      return { x: -OUT - step, y: -OUT }
    case 'tr':
      return { x: w + OUT + step, y: -OUT }
    case 'tru':
      return { x: w + OUT, y: -OUT - (BUTTON_SIZE + GAP) }
    case 'br':
      return { x: w + OUT + step, y: h + OUT }
    case 'bl':
      return { x: -OUT - step, y: h + OUT }
    case 'top':
      return { x: w / 2, y: -OUT - BUTTON_SIZE }
  }
}
