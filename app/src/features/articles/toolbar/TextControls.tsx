import type { Editor } from '@tiptap/react'
import { useState } from 'react'
import { FONTS } from '../../board/fonts'
import { setFontSize } from './toolbarCommands'
import { FONT_SIZES } from './toolbarConfig'
import ToolbarDropdown from './ToolbarDropdown'

/** The font, as the map's text sidebar has it: each name in its own font */
export function FontSelect({ editor, font }: { editor: Editor; font: string }) {
  const known = font === '' || FONTS.some((f) => f.stack === font)
  const options = [
    { value: '', label: 'Default font' },
    ...(known ? [] : [{ value: font, label: font }]),
    ...FONTS.map((f) => ({
      value: f.stack,
      label: f.name,
      style: { fontFamily: f.stack },
    })),
  ]
  return (
    <ToolbarDropdown
      kind="field"
      label="Font"
      width="w-36"
      value={font}
      options={options}
      onChange={(next) => (next ? editor.chain().focus().setFontFamily(next).run() : editor.chain().focus().unsetFontFamily().run())}
    />
  )
}

/** The font size, as the map's text sidebar has it: a number (px) you can type, and the sizes to pick from, many, a few with a name */
export function SizeControl({ editor, size }: { editor: Editor; size: number }) {
  const { min, max, common } = FONT_SIZES
  // What is typed, until Enter or leaving the input; null: showing the size
  const [typed, setTyped] = useState<string | null>(null)
  const apply = (px: number) => setFontSize(editor, px)
  const commitTyped = () => {
    const n = Math.round(Number(typed))
    setTyped(null)
    if (Number.isFinite(n) && n >= min && n <= max && n !== size) apply(n)
  }
  return (
    <ToolbarDropdown
      kind="field"
      label="Font size"
      width="w-16"
      centerOptions
      value={String(Math.round(size))}
      options={common.map((z) => ({
        value: String(z.size),
        label: String(z.size),
        hint: z.name,
      }))}
      onChange={(n) => apply(Number(n))}
    >
      <input
        type="number"
        min={min}
        max={max}
        value={typed ?? Math.round(size)}
        aria-label="Font size"
        onChange={(e) => {
          const inputType = (e.nativeEvent as InputEvent).inputType
          setTyped(e.target.value)
          // Typing waits for Enter or leaving
          const n = Number(e.target.value)
          if (inputType !== 'insertText' && inputType !== 'deleteContentBackward' && n >= min && n <= max) {
            setTyped(null)
            apply(Math.round(n))
          }
        }}
        onBlur={commitTyped}
        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
        className="box-content h-4 min-w-0 flex-1 appearance-none border-0 bg-transparent px-2 py-sm text-center text-body leading-none outline-none [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
    </ToolbarDropdown>
  )
}
