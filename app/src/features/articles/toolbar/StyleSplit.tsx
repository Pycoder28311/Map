import type { Editor } from '@tiptap/react'
import type { CSSProperties } from 'react'
import { LuBold, LuItalic } from 'react-icons/lu'
import type { PlainIcon } from '../../../components/ui/icons/IconSlot'
import { setTextLook } from './toolbarCommands'
import { SLANTS, WEIGHTS } from './toolbarConfig'
import { FormatToggle } from './parts'
import ToolbarDropdown from './ToolbarDropdown'

type StyleOption = { value: string; label: string; hint?: string; style: CSSProperties }

/**
 * A format's button and the arrow of a dropdown of how much of it (Bold's weights, Italic's slants), like the underline's: the list has a
 * heading, each option is drawn in its own look, the current one ticked. Defined once; Bold and Italic give their lists and commands
 */
function StyleSplit(props: {
  /** The button's name (and its hover tip's) */
  name: string
  /** The dropdown's name */
  label: string
  heading: { value: string; label: string }
  options: StyleOption[]
  /** The option the text has now */
  current: string
  /** The format is on (the button pressed) */
  on: boolean
  icon: PlainIcon
  onPick: (value: string) => void
  onToggle: () => void
}) {
  return (
    <ToolbarDropdown
      kind="split"
      name={props.name}
      label={props.label}
      options={[{ ...props.heading, heading: true }, ...props.options.map((o) => ({ ...o, checked: o.value === props.current }))]}
      onChange={props.onPick}
    >
      <FormatToggle icon={props.icon} label={props.name} on={props.on} onClick={props.onToggle} />
    </ToolbarDropdown>
  )
}

/** Bold: the button that makes it bold, and the arrow of a dropdown of how bold (100 to 900) */
export function BoldControl({ editor, bold, weight }: { editor: Editor; bold: boolean; weight: string }) {
  const on = bold || (weight !== '' && weight !== '400')
  return (
    <StyleSplit
      name="Bold"
      label="How bold"
      heading={{ value: 'heading:weight', label: 'Weight' }}
      options={WEIGHTS.map((w) => ({ value: w.value, label: w.label, hint: w.value, style: { fontWeight: Number(w.value) } }))}
      current={weight || (bold ? '700' : '400')}
      on={on}
      icon={LuBold}
      // A weight is the text's own, so the bold mark goes (they would mix); Regular takes both off
      onPick={(w) =>
        setTextLook(editor, 'fontWeight', w === '400' ? null : w)
          .unsetBold()
          .run()
      }
      onToggle={() => (on ? setTextLook(editor, 'fontWeight', null).unsetBold().run() : editor.chain().focus().toggleBold().run())}
    />
  )
}

/** Italic: the button that makes it italic, and the arrow of a dropdown of how much it leans */
export function ItalicControl({ editor, italic, slant }: { editor: Editor; italic: boolean; slant: string }) {
  const on = italic || slant !== ''
  return (
    <StyleSplit
      name="Italic"
      label="How slanted"
      heading={{ value: 'heading:slant', label: 'Slant' }}
      options={SLANTS.map((z) => ({ value: z.value, label: z.label, style: { fontStyle: z.value } }))}
      current={slant || (italic ? 'italic' : '')}
      on={on}
      icon={LuItalic}
      // Normal is the editor's own italic; an oblique one is the text's own style, so the italic mark goes (they would mix)
      onPick={(z) => (z === 'italic' ? setTextLook(editor, 'fontStyle', null).setItalic().run() : setTextLook(editor, 'fontStyle', z).unsetItalic().run())}
      onToggle={() => (on ? setTextLook(editor, 'fontStyle', null).unsetItalic().run() : editor.chain().focus().toggleItalic().run())}
    />
  )
}
