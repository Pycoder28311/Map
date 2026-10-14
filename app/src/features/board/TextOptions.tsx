import { useEditorState } from '@tiptap/react'
import { LuAlignCenter, LuAlignLeft, LuAlignRight, LuBold, LuItalic, LuStrikethrough, LuUnderline } from 'react-icons/lu'
import IconButton from '../../components/ui/buttons/IconButton'
import ColourField from '../../components/ui/fields/ColourField'
import RangeField from '../../components/ui/fields/RangeField'
import { KEEP_EDITING, useActiveEditor } from './activeEditor'
import { runsPatch } from './areaName'
import { updateObject } from './boardStore'
import { applyMark, plainOf, type Marks } from './textRuns'
import { runsOf, type TextAlign, type TextObject } from './types'

type Props = { mapId: string; text: TextObject }

const ALIGNS: { id: TextAlign; icon: typeof LuAlignLeft; label: string }[] = [
  { id: 'left', icon: LuAlignLeft, label: 'Align left' },
  { id: 'center', icon: LuAlignCenter, label: 'Align centre' },
  { id: 'right', icon: LuAlignRight, label: 'Align right' },
]

const keep = (e: { preventDefault: () => void }) => e.preventDefault()

/**
 * The text's options (map.md's common text editor): marks, colour, size, alignment, opacity. While the text is being edited
 * the marks, colour and size apply to what is selected in the editor; otherwise to the whole text (one undo step each).
 */
export default function TextOptions({ mapId, text }: Props) {
  const editor = useActiveEditor()
  const state = useEditorState({
    editor,
    selector: (ctx) => ({
      bold: ctx.editor?.isActive('bold') ?? false,
      italic: ctx.editor?.isActive('italic') ?? false,
      underline: ctx.editor?.isActive('underline') ?? false,
      strike: ctx.editor?.isActive('strike') ?? false,
      color: (ctx.editor?.getAttributes('textStyle').color as string | undefined) ?? null,
      size: ctx.editor ? Number.parseFloat(String(ctx.editor.getAttributes('textStyle').fontSize ?? '')) || null : null,
    }),
  })

  const runs = runsOf(text)
  const total = plainOf(runs).length
  const all = (mark: 'bold' | 'italic' | 'underline' | 'strike') => runs.length > 0 && runs.every((r) => r[mark])
  const on = (mark: 'bold' | 'italic' | 'underline' | 'strike') => (editor ? (state?.[mark] ?? false) : all(mark))

  const toggle = (mark: 'bold' | 'italic' | 'underline' | 'strike') => {
    if (editor) {
      const chain = editor.chain().focus()
      ;(mark === 'bold' ? chain.toggleBold() : mark === 'italic' ? chain.toggleItalic() : mark === 'underline' ? chain.toggleUnderline() : chain.toggleStrike()).run()
    } else {
      const marks: Marks = { [mark]: !all(mark) }
      updateObject(mapId, text.id, runsPatch(applyMark(runs, 0, total, marks)))
    }
  }
  const setColor = (color: string) => {
    if (editor) editor.chain().focus().setColor(color).run()
    else updateObject(mapId, text.id, { color, ...runsPatch(applyMark(runs, 0, total, { color: undefined })) })
  }
  const setSize = (size: number) => {
    if (editor) editor.chain().focus().setFontSize(`${size}px`).run()
    else updateObject(mapId, text.id, { size, ...runsPatch(applyMark(runs, 0, total, { size: undefined })) })
  }

  const buttons = [
    { mark: 'bold', icon: LuBold, label: 'Bold (Ctrl+B)' },
    { mark: 'italic', icon: LuItalic, label: 'Italic (Ctrl+I)' },
    { mark: 'underline', icon: LuUnderline, label: 'Underline (Ctrl+U)' },
    { mark: 'strike', icon: LuStrikethrough, label: 'Strikethrough' },
  ] as const

  return (
    <div {...{ [KEEP_EDITING]: '' }} className="flex flex-col gap-3">
      <div className="flex items-center gap-1">
        {buttons.map((b) => (
          <IconButton key={b.mark} icon={b.icon} label={b.label} variant={on(b.mark) ? 'primary' : 'ghost'} aria-pressed={on(b.mark)} onMouseDown={keep} onClick={() => toggle(b.mark)} />
        ))}
        <span aria-hidden className="mx-1 h-6 w-px bg-line" />
        {ALIGNS.map((a) => (
          <IconButton key={a.id} icon={a.icon} label={a.label} variant={text.align === a.id ? 'primary' : 'ghost'} aria-pressed={text.align === a.id} onMouseDown={keep} onClick={() => updateObject(mapId, text.id, { align: a.id })} />
        ))}
      </div>
      <ColourField label="Colour" value={(editor ? state?.color : null) ?? text.color} onLive={() => {}} onCommit={setColor} />
      <RangeField label="Size" value={(editor ? state?.size : null) ?? text.size} min={6} max={200} onLive={() => {}} onCommit={setSize} />
      <RangeField label="Opacity" value={text.opacity} min={1} max={100} suffix="%" onLive={() => {}} onCommit={(opacity) => updateObject(mapId, text.id, { opacity })} />
    </div>
  )
}
