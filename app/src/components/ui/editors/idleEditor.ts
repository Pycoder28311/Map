import { Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'

let idle: Editor | null = null

/**
 * An editor with no text and nothing on the page: what a toolbar reads its buttons' state from while its own editor isn't there yet (the
 * article's text before it is clicked). Its buttons are disabled meanwhile, so nothing is ever done to it
 */
export function idleEditor(): Editor {
  idle ??= new Editor({ extensions: [StarterKit], editable: false })
  return idle
}
