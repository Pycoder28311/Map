import type { Editor } from '@tiptap/react'
import { LuUnderline } from 'react-icons/lu'
import ColourPicker from '../../../components/ui/fields/ColourPicker'
import { DEFAULT_COLOURS, UNDERLINE_KINDS } from './toolbarConfig'
import { FormatToggle } from './parts'
import ToolbarDropdown from './ToolbarDropdown'

/** Underline: the button that underlines, and the arrow of a dropdown of its kind and colour ('' is the text's own colour), in one field like the font size's */
export default function UnderlineControl({ editor, on, kind, colour }: { editor: Editor; on: boolean; kind: string; colour: string }) {
  const options = [
    // No underline at all
    { value: 'none:', label: 'None', checked: !on },
    { value: 'heading:kind', label: 'Kind', heading: true },
    // Each kind's name is underlined that way
    ...UNDERLINE_KINDS.map((k) => ({
      value: `kind:${k}`,
      label: k[0].toUpperCase() + k.slice(1),
      checked: on && kind === k,
      style: {
        textDecorationLine: 'underline',
        textDecorationStyle: k as 'solid',
        textDecorationThickness: '2px',
        textUnderlineOffset: '4px',
      },
    })),
    { value: 'heading:colour', label: 'Colour', heading: true },
    // Any other colour: the picker under the list (its squares are the only ones)
    {
      value: 'colour:',
      label: 'Same as the text',
      checked: on && colour === '',
    },
  ]
  // A pick sets that part of the underline (and underlines the selection if it is not yet), keeping the other: solid and the text's colour are left unwritten
  const pick = (value: string) => {
    const [part, picked] = [value.slice(0, value.indexOf(':')), value.slice(value.indexOf(':') + 1)]
    if (part === 'none') return void editor.chain().focus().unsetUnderline().run()
    const next = {
      textDecorationColor: colour || null,
      textDecorationStyle: kind === 'solid' ? null : kind,
    }
    if (part === 'kind') next.textDecorationStyle = picked === 'solid' ? null : picked
    else next.textDecorationColor = picked || null
    editor.chain().focus().setMark('underline', next).run()
  }
  // Any colour: the picker the colour buttons have, at the end of the list
  const setColour = (hex: string, final: boolean) => {
    const chain = final ? editor.chain().focus() : editor.chain()
    chain
      .setMark('underline', {
        textDecorationColor: hex,
        textDecorationStyle: kind === 'solid' ? null : kind,
      })
      .run()
  }
  return (
    <ToolbarDropdown
      kind="split"
      name="Underline"
      label="Underline kind and colour"
      options={options}
      onChange={pick}
      extra={
        <div className="border-t border-line p-2">
          <ColourPicker key={colour} value={colour || DEFAULT_COLOURS.text} onLive={(hex) => setColour(hex, false)} onCommit={(hex) => setColour(hex, true)} />
        </div>
      }
    >
      {/* The icon is drawn in the underline's own colour while the text has one */}
      <FormatToggle label="Underline" on={on} onClick={() => editor.chain().focus().toggleUnderline().run()}>
        <LuUnderline style={colour ? { color: colour } : undefined} />
      </FormatToggle>
    </ToolbarDropdown>
  )
}
