import type { Editor } from '@tiptap/react'
import { useState } from 'react'
import { LuLink } from 'react-icons/lu'
import TextField from '../../../components/ui/fields/TextField'
import BarPopover from '../../../components/ui/overlays/BarPopover'
import { FormActions } from '../links/LinkForms'
import { TextButton } from './parts'
import { setWebLink, unsetWebLink } from './toolbarCommands'
import { TOOLBAR_TIPS } from './toolbarTexts'
import type { ToolbarState } from './useToolbarState'

/** Link: a link icon and its name; it opens the web address of the selected words (or of the link the caret is in), with Remove on a link */
export default function LinkPopover({ editor, state }: { editor: Editor; state: Pick<ToolbarState, 'link' | 'selected' | 'href'> }) {
  const [open, setOpen] = useState(false)
  const [href, setHref] = useState('')
  // Only on selected words, or on a link to change or remove
  const usable = state.selected || state.link
  return (
    <BarPopover
      label="Link"
      open={open}
      onOpenChange={setOpen}
      trigger={
        <TextButton
          icon={LuLink}
          label="Link"
          big
          active={state.link}
          disabled={!usable}
          tip={!usable ? TOOLBAR_TIPS.selectFirst : TOOLBAR_TIPS.link}
          onClick={() => {
            setHref(state.href)
            setOpen((was) => !was)
          }}
        />
      }
    >
      <form
        className="flex flex-col gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          setWebLink(editor, href)
          setOpen(false)
        }}
      >
        <TextField label="Link address" placeholder="https://…" value={href} onChange={(e) => setHref(e.target.value)} autoFocus />
        <FormActions
          onRemove={
            state.link
              ? () => {
                  unsetWebLink(editor)
                  setOpen(false)
                }
              : undefined
          }
        />
      </form>
    </BarPopover>
  )
}
