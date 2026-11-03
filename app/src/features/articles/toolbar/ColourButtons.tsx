import type { Editor } from '@tiptap/react'
import { LuHighlighter } from 'react-icons/lu'
import ColourField from '../../../components/ui/fields/ColourField'
import { Group, Tip } from './parts'
import { TOOLBAR_TIPS } from './toolbarTexts'
import type { ToolbarState } from './useToolbarState'

/** Text colour (a coloured A) and Background colour; `explained`: their hover tips say what they do (the second row's, level 2) */
export default function ColourButtons({ editor, state, explained }: { editor: Editor; state: ToolbarState; explained: boolean }) {
  return (
    <Group>
      <Tip name="Text colour" text={explained ? TOOLBAR_TIPS.textColour : undefined}>
        <ColourField
          label="Text colour"
          letter="A"
          value={state.colour}
          shown={state.shownColour}
          onLive={(hex) => editor.chain().setColor(hex).run()}
          onCommit={(hex) => editor.chain().focus().setColor(hex).run()}
        />
      </Tip>
      <Tip name="Background colour" text={explained ? TOOLBAR_TIPS.backgroundColour : undefined}>
        <ColourField
          label="Background colour"
          icon={LuHighlighter}
          value={state.background}
          // No background on the text: no colour bar under the icon
          shown={state.backgroundSet || 'transparent'}
          onLive={(hex) => editor.chain().setBackgroundColor(hex).run()}
          onCommit={(hex) => editor.chain().focus().setBackgroundColor(hex).run()}
        />
      </Tip>
    </Group>
  )
}
