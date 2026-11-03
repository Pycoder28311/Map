import type { Editor } from '@tiptap/react'
import { useState } from 'react'
import { LuImage } from 'react-icons/lu'
import Button from '../../../components/ui/buttons/Button'
import BarPopover from '../../../components/ui/overlays/BarPopover'
import { TextButton } from './parts'
import { insertDivider, insertTable } from './toolbarCommands'
import { INSERTS, type Insert } from './toolbarConfig'

/** Media: an image icon and its name; it opens the image, table and divider choice (`onImage`: the picture picker) */
export default function InsertMenu({ editor, onImage }: { editor: Editor; onImage: () => void }) {
  const [open, setOpen] = useState(false)
  const insert = (what: Insert) => {
    if (what === 'image') onImage()
    else if (what === 'table') insertTable(editor)
    else insertDivider(editor)
  }
  return (
    <BarPopover
      label="Insert"
      open={open}
      onOpenChange={setOpen}
      trigger={<TextButton icon={LuImage} label="Media" title="Insert: image, table, divider" active={open} onClick={() => setOpen((was) => !was)} />}
    >
      <div className="flex flex-col gap-0.5">
        {INSERTS.map((i) => (
          <Button
            key={i.value}
            variant="ghost"
            size="sm"
            icon={i.icon}
            className="w-full justify-start"
            onClick={() => {
              setOpen(false)
              insert(i.value)
            }}
          >
            {i.label}
          </Button>
        ))}
      </div>
    </BarPopover>
  )
}
