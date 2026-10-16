import { useEditorState } from '@tiptap/react'
import { useActiveEditor } from '../../activeEditor'
import { shadowOffset } from '../../textShadow'
import { runsPatch } from '../../areaName'
import { updateObject, type Patch } from '../../boardStore'
import { WEIGHT_BOLD, WEIGHT_NORMAL } from '../../fonts'
import { setTextPen, useTextPen, type TextPen } from '../../pen'
import { applyMark, plainOf, type Marks } from '../../textRuns'
import { runsOf, type TextObject } from '../../types'
import type { FontMark } from './TextFontSection'

/** The style fields of a text, all there (the pen's own shape: what a text leaves out is filled in) */
export type TextValue = TextPen

/**
 * Where the text sidebar's sections get their values from and send their changes to: the Text tool's pen or one text object.
 * The sections know nothing else, so the two sidebars show the same sections.
 */
export type TextSource = {
  value: TextValue
  /** What the controls show where the editor's selection (or the marks of the runs) decides, not the whole text's own value */
  shown: { size: number; color: string; bold: boolean; marks: Record<FontMark, boolean> }
  /** A finished change (one undo step for a text) */
  onChange: (patch: Partial<TextValue>) => void
  /** A change still moving (a colour picker, a bar): only the pen shows it; a text waits for the end */
  onLive: (patch: Partial<TextValue>) => void
  toggleBold: () => void
  toggleMark: (mark: FontMark) => void
  setColor: (color: string) => void
  setSize: (size: number) => void
}

/** A text's style fields with what it leaves out filled in (the same defaults the canvas paints with) */
export function textValueOf(text: TextObject): TextValue {
  return {
    size: text.size,
    color: text.color,
    align: text.align,
    opacity: text.opacity,
    fixedSize: text.fixedSize ?? false,
    font: text.font ?? 0,
    weight: text.weight ?? WEIGHT_NORMAL,
    italic: text.italic ?? false,
    underline: text.underline ?? false,
    strike: text.strike ?? false,
    oblique: text.oblique ?? false,
    underlineColor: text.underlineColor ?? null,
    strikeColor: text.strikeColor ?? null,
    strokeColor: text.strokeColor ?? '#000000',
    strokeWidth: text.strokeWidth ?? 0,
    strokeOpacity: text.strokeOpacity ?? 100,
    shadowColor: text.shadowColor ?? '#000000',
    shadowBlur: text.shadowBlur ?? 0,
    shadowDistance: text.shadowDistance ?? 0,
    shadowY: shadowOffset(text).y,
    curve: text.curve ?? 0,
    spacing: text.spacing ?? 0,
    boxed: text.boxed ?? false,
    boxShape: text.boxShape ?? 'square',
    lineGap: text.lineGap ?? 0,
    boxColor: text.boxColor ?? null,
    rotation: text.rotation,
  }
}

/** The Text tool's pen as a source: every change is saved at once, nothing is undoable */
export function usePenTextSource(): TextSource {
  const pen = useTextPen()
  return {
    value: pen,
    shown: { size: pen.size, color: pen.color, bold: pen.weight >= WEIGHT_BOLD, marks: { italic: pen.italic, underline: pen.underline, strike: pen.strike } },
    onChange: setTextPen,
    onLive: setTextPen,
    toggleBold: () => setTextPen({ weight: pen.weight >= WEIGHT_BOLD ? WEIGHT_NORMAL : WEIGHT_BOLD }),
    toggleMark: (mark) => setTextPen({ [mark]: !pen[mark] }),
    setColor: (color) => setTextPen({ color }),
    setSize: (size) => setTextPen({ size }),
  }
}

/**
 * One text as a source. While the text is being edited the marks, colour and size apply to what is selected in the editor;
 * otherwise to the whole text (one undo step each).
 */
export function useTextSource(mapId: string, text: TextObject): TextSource {
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
  const all = (mark: 'bold' | FontMark) => runs.length > 0 && runs.every((r) => r[mark])
  const on = (mark: 'bold' | FontMark) => (editor ? (state?.[mark] ?? false) : all(mark))

  const toggle = (mark: 'bold' | FontMark) => {
    if (editor) {
      const chain = editor.chain().focus()
      ;(mark === 'bold' ? chain.toggleBold() : mark === 'italic' ? chain.toggleItalic() : mark === 'underline' ? chain.toggleUnderline() : chain.toggleStrike()).run()
    } else {
      const marks: Marks = { [mark]: !all(mark) }
      updateObject(mapId, text.id, runsPatch(applyMark(runs, 0, total, marks)))
    }
  }

  return {
    value: textValueOf(text),
    shown: {
      size: (editor ? state?.size : null) ?? text.size,
      color: (editor ? state?.color : null) ?? text.color,
      bold: (text.weight ?? WEIGHT_NORMAL) >= WEIGHT_BOLD || on('bold'),
      marks: { italic: on('italic') || !!text.italic, underline: on('underline') || !!text.underline, strike: on('strike') || !!text.strike },
    },
    onChange: (patch) => updateObject(mapId, text.id, patch as Patch),
    onLive: () => {},
    // The text's own flag is what the buttons show along with the marks; turning one off clears both
    toggleMark: (mark) => {
      if (!text[mark]) return toggle(mark)
      if (editor) {
        const chain = editor.chain().focus()
        ;(mark === 'italic' ? chain.unsetItalic() : mark === 'underline' ? chain.unsetUnderline() : chain.unsetStrike()).run()
        updateObject(mapId, text.id, { [mark]: false })
      } else updateObject(mapId, text.id, { [mark]: false, ...runsPatch(applyMark(runs, 0, total, { [mark]: false })) })
    },
    toggleBold: () => {
      if ((text.weight ?? WEIGHT_NORMAL) < WEIGHT_BOLD) {
        if (!on('bold')) return updateObject(mapId, text.id, { weight: WEIGHT_BOLD })
        return toggle('bold')
      }
      if (editor) editor.chain().focus().unsetBold().run()
      updateObject(mapId, text.id, editor ? { weight: WEIGHT_NORMAL } : { weight: WEIGHT_NORMAL, ...runsPatch(applyMark(runs, 0, total, { bold: false })) })
    },
    setColor: (color) => {
      if (editor) editor.chain().focus().setColor(color).run()
      else updateObject(mapId, text.id, { color, ...runsPatch(applyMark(runs, 0, total, { color: undefined })) })
    },
    setSize: (size) => {
      if (editor) editor.chain().focus().setFontSize(`${size}px`).run()
      else updateObject(mapId, text.id, { size, ...runsPatch(applyMark(runs, 0, total, { size: undefined })) })
    },
  }
}
