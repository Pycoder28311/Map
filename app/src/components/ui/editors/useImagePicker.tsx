import type { Editor } from '@tiptap/react'
import { useRef } from 'react'
import { IMAGE_ACCEPT, insertImages } from './insertImages'

/**
 * A hidden picture picker: `open()` asks for files, and each is uploaded and put in the text at the caret (`editor()`: the editor then).
 * `input` is the element to place anywhere in the page
 */
export function useImagePicker(editor: () => Editor | null, upload: (file: File) => Promise<string>, onError: (error: unknown) => void) {
  const picker = useRef<HTMLInputElement>(null)
  const input = (
    <input
      ref={picker}
      type="file"
      accept={IMAGE_ACCEPT}
      multiple
      hidden
      onChange={(e) => {
        const ed = editor()
        if (ed) void insertImages(ed, [...(e.target.files ?? [])], upload, onError)
        e.target.value = ''
      }}
    />
  )
  return { open: () => picker.current?.click(), input }
}
