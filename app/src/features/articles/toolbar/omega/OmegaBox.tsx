import type { Editor } from '@tiptap/react'
import type { ReactNode } from 'react'
import { LuChevronDown, LuOmega } from 'react-icons/lu'
import IconButton from '../../../../components/ui/buttons/IconButton'
import { insertStructure, STRUCTURES } from '../../../../components/ui/editors/structures'
import BarPopover from '../../../../components/ui/overlays/BarPopover'
import HoverInfo, { TIP_DELAY } from '../../../../components/ui/overlays/HoverInfo'
import { keepFocus } from '../../../../lib/keepFocus'
import { BOX_STRUCTURES } from '../toolbarConfig'
import { STRUCTURE_TIPS, TOOLBAR_TIPS } from '../toolbarTexts'
import MoreFormats from './MoreFormats'
import StructureIcon from './StructureIcon'
import { GROUP_EXAMPLES } from './symbols'

const POPOUT_LABEL = 'Structures, shapes, maths and other characters'

/** One example of the Ω box: a button that puts it in the text, as tall as the box */
function OmegaExample({ title, text, label, onClick, children }: { title: string; text: string; label: string; onClick: () => void; children: ReactNode }) {
  return (
    <HoverInfo title={title} text={text} side="top" delay={TIP_DELAY}>
      <IconButton label={label} size="xs" className="h-full! min-h-0!" onMouseDown={keepFocus} onClick={onClick}>
        {children}
      </IconButton>
    </HoverInfo>
  )
}

/**
 * The Ω box at the right end of row 2: the examples (Word-like structures with places to fill, and the first character of each other
 * group) and the square arrow that opens the popout, as Word's equation gallery has them; on a narrow bar (`compact`) only the Ω that opens
 * them all. The popout: Basics (the structures, superscript, subscript), SVGs, Mathematical, Others
 */
export default function OmegaBox({ editor, compact, open, onOpenChange }: { editor: Editor; compact: boolean; open: boolean; onOpenChange: (open: boolean) => void }) {
  const popout = (trigger: ReactNode) => (
    <BarPopover label={POPOUT_LABEL} open={open} align="end" width="w-1/2" onOpenChange={onOpenChange} trigger={trigger}>
      <MoreFormats editor={editor} />
    </BarPopover>
  )
  const toggle = () => onOpenChange(!open)

  if (compact)
    // A narrow bar: no examples, only the Ω that opens them all
    return popout(
      <HoverInfo title="Characters" text={TOOLBAR_TIPS.characters} side="top" delay={TIP_DELAY}>
        <IconButton
          icon={LuOmega}
          label={POPOUT_LABEL}
          size="sm"
          variant={open ? 'selected' : 'ghost'}
          aria-expanded={open}
          onMouseDown={keepFocus}
          onClick={toggle}
          className="[&>svg]:size-5!"
        />
      </HoverInfo>,
    )

  return (
    // One box, as tall as the font dropdown (a line of text, 1rem, and --spacing-sm above and below it, and its border), no lines between the examples
    <div role="group" aria-label="Maths structures" className="flex h-[calc(1rem+2*var(--spacing-sm)+2px)] items-stretch overflow-hidden rounded-(--field-radius) border border-line-strong">
      {BOX_STRUCTURES.map((kind) => (
        <OmegaExample key={kind} title={STRUCTURES[kind].label} text={STRUCTURE_TIPS[kind]} label={STRUCTURES[kind].label} onClick={() => insertStructure(editor, kind)}>
          <StructureIcon kind={kind} />
        </OmegaExample>
      ))}
      {/* The first character of each other group (SVGs, Mathematical, Others) */}
      {GROUP_EXAMPLES.map((char) => (
        <OmegaExample
          key={char}
          title={`Insert ${char}`}
          text={`Puts ${char} in the text where the cursor is.`}
          label={`Insert ${char}`}
          onClick={() => editor.chain().focus().insertContent(char).run()}
        >
          <span aria-hidden className="text-[1.1rem] leading-none">
            {char}
          </span>
        </OmegaExample>
      ))}
      {popout(
        <HoverInfo title="More characters" text={TOOLBAR_TIPS.moreCharacters} side="top" delay={TIP_DELAY}>
          <IconButton
            icon={LuChevronDown}
            label="More structures, shapes, maths and other characters"
            size="xs"
            className="aspect-square h-full! min-h-0!"
            variant={open ? 'selected' : 'ghost'}
            aria-expanded={open}
            onMouseDown={keepFocus}
            onClick={toggle}
          />
        </HoverInfo>,
      )}
    </div>
  )
}
