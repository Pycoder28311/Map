// What a selection can be changed with (map.md): the buttons floating on its box, the row of its sidebar, and the points dragged on its box. Pure (selectionButtons.test.ts).
import { LuCopy, LuFlipHorizontal2, LuFlipVertical2, LuLink, LuSplit, LuX } from 'react-icons/lu'
import type { PlainIcon } from '../../components/ui/icons/IconSlot'
import type { BoxHandle, CornerHandle, EdgeHandle } from './operations'
import type { BoardObject } from './types'

/** What floats on the box */
export type BoxAction = 'remove' | 'link'
/** What is in the row under the sidebar's title */
export type SidebarAction = 'flipH' | 'flipV' | 'split' | 'duplicate'

/** Where on the box a floating button sits: br: below-right of the bottom-right corner · bl: below-left of the bottom-left corner */
export type Corner = 'br' | 'bl'

type ActionInfo<T> = {
  action: T
  icon: PlainIcon
  label: string
  /** What the hover card says */
  info: string
  shortcut?: string
}

export type BoxButton = ActionInfo<BoxAction> & { corner: Corner }
export type SidebarButton = ActionInfo<SidebarAction>

const REMOVE: BoxButton = { action: 'remove', corner: 'br', icon: LuX, label: 'Remove', info: 'Take it off the map. Undo brings it back.', shortcut: 'Delete' }
const LINK: BoxButton = { action: 'link', corner: 'bl', icon: LuLink, label: 'Link to other objects', info: 'Pick notes in the sidebar to link to it.' }

/** The buttons on the box (none for nothing selected): Remove, and Link for one object, always at the bottom left */
export function buttonsFor(selected: BoardObject[]): BoxButton[] {
  if (selected.length === 0) return []
  return selected.length > 1 ? [REMOVE] : [LINK, REMOVE]
}

const SIDEBAR_BUTTON: Record<SidebarAction, SidebarButton> = {
  flipH: { action: 'flipH', icon: LuFlipHorizontal2, label: 'Flip horizontally', info: 'Mirror left and right.' },
  flipV: { action: 'flipV', icon: LuFlipVertical2, label: 'Flip vertically', info: 'Mirror top and bottom.' },
  split: { action: 'split', icon: LuSplit, label: 'Split', info: 'Click it, then click the point of the line to cut it in two.', shortcut: 'Double-click' },
  duplicate: { action: 'duplicate', icon: LuCopy, label: 'Duplicate', info: 'Make a copy next to it.', shortcut: 'Ctrl+D' },
}

/** The row under the sidebar's title, for a selection (several objects, or each kind what it can do) */
export function sidebarButtonsFor(selected: BoardObject[]): SidebarButton[] {
  if (selected.length === 0) return []
  const actions = (): SidebarAction[] => {
    if (selected.length > 1) return ['flipH', 'flipV', 'duplicate']
    switch (selected[0].kind) {
      case 'line':
        return ['flipH', 'flipV', 'split', 'duplicate']
      case 'border':
        return ['split']
      case 'shape':
        return ['flipH', 'flipV', 'duplicate']
      case 'text':
      case 'point':
        return ['duplicate']
    }
  }
  return actions().map((action) => SIDEBAR_BUTTON[action])
}

const CORNERS: CornerHandle[] = ['tl', 'tr', 'bl', 'br']
const EDGES: EdgeHandle[] = ['t', 'r', 'b', 'l']

/** The points dragged on the box: none for a pin alone (it has no size), a text alone has no height of its own to set; everything else all eight */
export function handlesFor(selected: BoardObject[]): BoxHandle[] {
  if (selected.length === 0) return []
  if (selected.length === 1 && selected[0].kind === 'point') return []
  if (selected.length === 1 && selected[0].kind === 'text') return [...CORNERS, 'l', 'r']
  return [...CORNERS, ...EDGES]
}

/** Where a handle is, as a share of the box's width and height */
export function handlePlace(handle: BoxHandle): { x: number; y: number } {
  return {
    x: handle.includes('l') ? 0 : handle.includes('r') ? 1 : 0.5,
    y: handle.includes('t') ? 0 : handle.includes('b') ? 1 : 0.5,
  }
}

/** Size of a box button (px) */
export const BUTTON_SIZE = 28
/** How far a button is from its corner, along each axis (px) */
const OUT = 18

/** A button's centre, from the box's top-left corner (px), for a box `w` × `h` */
export function buttonCentre(corner: Corner, w: number, h: number): { x: number; y: number } {
  return { x: corner === 'br' ? w + OUT : -OUT, y: h + OUT }
}
