// What the edit bar's controls do to the editor, defined once.
import type { Editor } from '@tiptap/react'
import { cssRgbToHex } from '../../../components/ui/fields/colour'
import { DEFAULT_COLOURS, FONT_SIZES, type ListKind } from './toolbarConfig'

const TOGGLE_LIST: Record<Exclude<ListKind, 'none'>, (e: Editor) => void> = {
  bulletList: (e) => e.chain().focus().toggleBulletList().run(),
  orderedList: (e) => e.chain().focus().toggleOrderedList().run(),
  taskList: (e) => e.chain().focus().toggleTaskList().run(),
}

/** The List dropdown picked `picked` while the caret's list is `current`: that list on, or (No list) the current one off */
export function pickList(editor: Editor, picked: ListKind, current: ListKind) {
  if (picked !== 'none') TOGGLE_LIST[picked](editor)
  else if (current !== 'none') TOGGLE_LIST[current](editor)
}

/** A font size (px); the editor's own size is written as none */
export const setFontSize = (editor: Editor, px: number) =>
  px === FONT_SIZES.normal ? editor.chain().focus().unsetFontSize().run() : editor.chain().focus().setFontSize(`${px}px`).run()

/** Sets (or, with null, takes off) one look of the text's own style (its weight or slant), keeping the others */
export function setTextLook(editor: Editor, key: 'fontWeight' | 'fontStyle', value: string | null) {
  const attrs = editor.getAttributes('textStyle')
  return editor
    .chain()
    .focus()
    .setMark('textStyle', { ...attrs, [key]: value })
    .removeEmptyTextStyle()
}

/** The colour the text at the selection really shows (its own, or the editor's): what the colour icons are drawn in */
export function shownTextColour(e: Editor): string {
  try {
    const node = e.view.domAtPos(e.state.selection.from).node
    const el = node instanceof HTMLElement ? node : node.parentElement
    return (el && cssRgbToHex(getComputedStyle(el).color)) || DEFAULT_COLOURS.text
  } catch {
    return DEFAULT_COLOURS.text
  }
}

/** Media's Table and Divider */
export const insertTable = (editor: Editor) => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
export const insertDivider = (editor: Editor) => editor.chain().focus().setHorizontalRule().run()

/** The Link popover: the selected words (or the whole link the caret is in) link to `href`; an empty address takes the link off */
export function setWebLink(editor: Editor, href: string) {
  const url = href.trim()
  if (url) editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  else unsetWebLink(editor)
}
export const unsetWebLink = (editor: Editor) => editor.chain().focus().extendMarkRange('link').unsetLink().run()
