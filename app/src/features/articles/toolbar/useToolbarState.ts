import { useEditorState, type Editor } from '@tiptap/react'
import { paragraphLookOf } from '../../../components/ui/editors/articleExtensions'
import { shownTextColour } from './toolbarCommands'
import { ALIGNS, DEFAULT_COLOURS, LISTS, type Align, type ListKind } from './toolbarConfig'

/** What the edit bar shows of the text at the caret (its marks, its paragraph, Undo / Redo), followed as the editor changes */
export function useToolbarState(editor: Editor) {
  return useEditorState({
    editor,
    selector: ({ editor: e }) => {
      if (!e) return null
      const style = e.getAttributes('textStyle') as {
        fontFamily?: string
        fontSize?: string
        color?: string
        backgroundColor?: string
        fontWeight?: string
        fontStyle?: string
      }
      return {
        bold: e.isActive('bold'),
        italic: e.isActive('italic'),
        weight: style.fontWeight ?? '',
        slant: style.fontStyle ?? '',
        font: style.fontFamily ?? '',
        size: style.fontSize ?? '',
        colour: style.color ?? DEFAULT_COLOURS.text,
        shownColour: style.color ?? shownTextColour(e),
        colourSet: style.color ?? '',
        background: style.backgroundColor ?? DEFAULT_COLOURS.background,
        backgroundSet: style.backgroundColor ?? '',
        underline: e.isActive('underline'),
        look: paragraphLookOf(e),
        code: e.isActive('code'),
        underlineColour: (e.getAttributes('underline').textDecorationColor as string | undefined) ?? '',
        underlineKind: (e.getAttributes('underline').textDecorationStyle as string | undefined) ?? 'solid',
        list: (LISTS.find((l) => l.value !== 'none' && e.isActive(l.value))?.value ?? 'none') as ListKind,
        align: (ALIGNS.find((a) => e.isActive({ textAlign: a.value }))?.value ?? 'left') as Align,
        link: e.isActive('link'),
        // Words are selected (the Link button works on them)
        selected: !e.state.selection.empty,
        href: (e.getAttributes('link').href as string | undefined) ?? '',
        canUndo: e.can().undo(),
        canRedo: e.can().redo(),
      }
    },
  })
}

export type ToolbarState = NonNullable<ReturnType<typeof useToolbarState>>
