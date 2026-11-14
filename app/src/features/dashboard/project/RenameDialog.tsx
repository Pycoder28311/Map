import { useState, type FormEvent } from 'react'
import Button from '../../../components/ui/buttons/Button'
import InputBox from '../../../components/ui/fields/InputBox'
import Modal from '../../../components/ui/overlays/Modal'

/** A small dialog that renames an item: its title in a field, Save writes it (the change shows at once: actionsOf().update) */
export default function RenameDialog({ title, placeholder, onSave, onClose }: { title: string; placeholder: string; onSave: (title: string) => Promise<unknown> | void; onClose: () => void }) {
  const [value, setValue] = useState(title)
  const submit = (e?: FormEvent) => {
    e?.preventDefault()
    void onSave(value.trim())
    onClose()
  }
  return (
    <Modal
      open
      onClose={onClose}
      title="Rename"
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => submit()}>Save</Button>
        </>
      }
    >
      <form onSubmit={submit}>
        <InputBox>
          <input autoFocus value={value} placeholder={placeholder} onChange={(e) => setValue(e.target.value)} aria-label="Title" className="w-full bg-transparent text-fg outline-none placeholder:text-fg-subtle" />
        </InputBox>
      </form>
    </Modal>
  )
}
