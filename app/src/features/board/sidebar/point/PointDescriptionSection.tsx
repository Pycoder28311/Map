import type { Editor } from '@tiptap/react'
import { useState } from 'react'
import { LuBold, LuHeading2, LuItalic, LuList } from 'react-icons/lu'
import RichTextEditor from '../../../../components/ui/editors/RichTextEditor'
import { descriptionDoc, descriptionText } from '../../pointText'

/** The format buttons above the description. They do not take the focus from the editor */
function Format({ editor }: { editor: Editor | null }) {
  if (!editor) return null
  const item = (label: string, Icon: typeof LuBold, on: boolean, run: () => void) => (
    <button
      key={label}
      type="button"
      aria-label={label}
      aria-pressed={on}
      title={label}
      onMouseDown={(e) => e.preventDefault()}
      onClick={run}
      className={`flex size-8 cursor-pointer items-center justify-center rounded-(--corner-sm) hover:bg-fill ${on ? 'bg-fill text-accent' : ''}`}
    >
      <Icon className="size-4" />
    </button>
  )
  return (
    <div className="flex gap-0.5">
      {item('Bold', LuBold, editor.isActive('bold'), () => editor.chain().focus().toggleBold().run())}
      {item('Italic', LuItalic, editor.isActive('italic'), () => editor.chain().focus().toggleItalic().run())}
      {item('Heading', LuHeading2, editor.isActive('heading'), () => editor.chain().focus().toggleHeading({ level: 3 }).run())}
      {item('Bullet list', LuList, editor.isActive('bulletList'), () => editor.chain().focus().toggleBulletList().run())}
    </div>
  )
}

type Props = {
  /** Re-mounts the editor when another point is selected */
  id: number
  description: string | undefined
  /** The text, saved when the editor loses focus */
  onSave: (description: string) => void
}

/** A point's description: format buttons above a rich-text editor */
export default function PointDescriptionSection({ id, description, onSave }: Props) {
  const [editor, setEditor] = useState<Editor | null>(null)
  const [, redraw] = useState(0)
  return (
    <div className="flex flex-col gap-1">
      <span className="text-small text-fg-muted">Description</span>
      <Format editor={editor} />
      <RichTextEditor
        key={id}
        content={descriptionDoc(description)}
        onEditor={setEditor}
        onUpdate={() => redraw((n) => n + 1)}
        onBlur={() => {
          if (!editor) return
          const text = descriptionText(editor.getJSON())
          if (text !== (description ?? '')) onSave(text)
        }}
        className="min-h-24 rounded-(--field-radius) border border-line-strong bg-surface px-(--field-px) py-2 text-body [&_.ProseMirror]:min-h-20 [&_.ProseMirror]:outline-none [&_h3]:text-heading [&_ul]:list-disc [&_ul]:ps-5"
      />
    </div>
  )
}
