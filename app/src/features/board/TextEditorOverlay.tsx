import type { Editor } from '@tiptap/react'
import { useCallback, useEffect, useRef } from 'react'
import RichTextEditor from '../../components/ui/editors/RichTextEditor'
import { KEEP_EDITING, setActiveEditor, setFinisher } from './activeEditor'
import { WEIGHT_NORMAL, stackOf } from './fonts'
import { docToRuns, runsToDoc, type Doc } from './richText'
import { LINE_HEIGHT } from './textLayout'
import { runsOf, type TextObject, type TextRun } from './types'
import { boardToScreen, type Viewport } from './viewport'

type Props = {
  text: TextObject
  view: Viewport
  /** The words are done (the editor was left): the runs as they now are */
  onCommit: (runs: TextRun[]) => void
  /** Esc with nothing changed counts as done too; this is for a draft that was never typed in */
  onCancel: () => void
}

/**
 * The text being edited, in place: the editor over the canvas, at the text's place, scaled with the view and turned with it, with
 * the same font, line height and wrapping as the canvas paints with (textLayout.ts) so nothing moves when editing starts or stops.
 */
export default function TextEditorOverlay({ text, view, onCommit, onCancel }: Props) {
  const done = useRef(false)
  const at = boardToScreen(view, text.anchor)
  const wraps = text.width > 0

  const finish = useCallback(
    (editor: Editor) => {
      if (done.current) return
      done.current = true
      const runs = docToRuns(editor.getJSON() as Doc)
      if (runs.length === 0 || runs.every((r) => r.text.trim() === '')) onCancel()
      else onCommit(runs)
    },
    [onCommit, onCancel],
  )

  const editorRef = useRef<Editor | null>(null)
  const onEditor = useCallback((editor: Editor | null) => {
    editorRef.current = editor
    setActiveEditor(editor)
  }, [])
  // A click elsewhere on the map ends the editing even when the editor itself had already lost the focus (to the sidebar)
  useEffect(() => {
    setFinisher(() => editorRef.current && finish(editorRef.current))
    return () => setFinisher(null)
  }, [finish])

  return (
    <div
      data-no-drag
      style={{ left: at.x, top: at.y, transform: `scale(${text.fixedSize ? 1 : view.scale})`, transformOrigin: 'top left' }}
      className="pointer-events-auto absolute z-10"
      onKeyDown={(e) => {
        e.stopPropagation()
        if (e.key === 'Escape' && editorRef.current) {
          e.preventDefault()
          finish(editorRef.current)
        }
      }}
    >
      <div
        style={{
          width: wraps ? text.width : undefined,
          minWidth: 2,
          font: `${text.italic ? (text.oblique ? 'oblique ' : 'italic ') : ''}${text.weight ?? WEIGHT_NORMAL} ${text.size}px ${stackOf(text.font)}`,
          letterSpacing: text.spacing ? `${text.spacing}px` : undefined,
          WebkitTextStroke: (text.strokeWidth ?? 0) > 0 ? `${text.strokeWidth}px ${text.strokeColor ?? '#000000'}` : undefined,
          textShadow: (text.shadowBlur ?? 0) > 0 || (text.shadowDistance ?? 0) > 0 ? `${text.shadowDistance ?? 0}px ${text.shadowDistance ?? 0}px ${text.shadowBlur ?? 0}px ${text.shadowColor ?? '#000000'}` : undefined,
          textDecorationColor: (text.underline ? text.underlineColor : text.strikeColor) ?? undefined,
          textDecoration: [text.underline && 'underline', text.strike && 'line-through'].filter(Boolean).join(' ') || undefined,
          lineHeight: text.lineGap ? `calc(${LINE_HEIGHT}em + ${text.lineGap}px)` : LINE_HEIGHT,
          color: text.color,
          opacity: text.opacity / 100,
          textAlign: text.align,
          transform: `rotate(${text.rotation}deg)`,
          transformOrigin: 'center',
        }}
        className={`${wraps ? 'whitespace-pre-wrap' : 'w-max whitespace-pre'} outline-2 outline-dashed outline-accent/60 [overflow-wrap:anywhere] [&_.ProseMirror]:outline-none [&_.ProseMirror_p]:m-0`}
      >
        <RichTextEditor
          plain
          autoFocus
          content={runsToDoc(runsOf(text))}
          onEditor={onEditor}
          onBlur={(e) => {
            // A click on the sidebar's text controls is not leaving the editor
            if (e.relatedTarget instanceof Element && e.relatedTarget.closest(`[${KEEP_EDITING}]`)) return
            if (editorRef.current) finish(editorRef.current)
          }}
        />
      </div>
    </div>
  )
}
