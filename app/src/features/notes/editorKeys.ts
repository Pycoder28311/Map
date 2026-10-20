import type { Editor } from '@tiptap/react'

/** Whether the caret (no selection) is on the first line of the editor's text: ArrowUp from there leaves it */
export function isFirstLine(editor: Editor | null): boolean {
  if (!editor) return false
  const { selection } = editor.state
  return selection.empty && selection.$from.index(0) === 0 && editor.view.endOfTextblock('up')
}
