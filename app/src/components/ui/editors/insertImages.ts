import type { Editor } from '@tiptap/react'

/** Uploads picture files one at a time and puts each in the text at the caret, named by its file; a failed one is reported and skipped */
export async function insertImages(editor: Editor, files: File[], upload: (file: File) => Promise<string>, onError?: (error: unknown) => void) {
  for (const file of files) {
    try {
      const src = await upload(file)
      if (editor.isDestroyed) return
      editor.chain().focus().setImage({ src, alt: file.name.replace(/\.[^.]+$/, '') }).run()
    } catch (error) {
      onError?.(error)
    }
  }
}

/** The kinds of picture the server stores (an `<input type="file" accept>`) */
export const IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp'
