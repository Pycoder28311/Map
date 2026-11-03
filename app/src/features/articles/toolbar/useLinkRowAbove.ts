import { useEditorState, type Editor } from '@tiptap/react'
import type { RefObject } from 'react'
import { LINK_ROW_ROOM } from './toolbarConfig'

/**
 * Whether the links row goes above the bar instead of under it: the selected words are so near the bar's bottom edge that the row, under
 * the bar, would hide them. `slot`: the element the row is placed in (its parent is the bar). Read when the selection changes.
 */
export function useLinkRowAbove(editor: Editor | null, slot: RefObject<HTMLElement | null>): boolean {
  return (
    useEditorState({
      editor,
      selector: ({ editor: e }) => {
        const bar = slot.current?.parentElement
        if (!e || !bar || e.state.selection.empty) return false
        try {
          return e.view.coordsAtPos(e.state.selection.from).top < bar.getBoundingClientRect().bottom + LINK_ROW_ROOM
        } catch {
          return false
        }
      },
    }) ?? false
  )
}
