import { useId, useState, type FormEvent } from 'react'
import { burnDown } from '../../components/layout/sidebar/burnDown'
import { snapshotRows } from '../../components/ui/tree/rowFlip'
import Button from '../../components/ui/buttons/Button'
import TextField from '../../components/ui/fields/TextField'
import Modal from '../../components/ui/overlays/Modal'
import { createObjectOf, deleteObject } from '../../mocks/projectsStore'
import type { SidebarItem } from '../../mocks/sidebarTree'

const MAX_NAME = 100

/** The object dialog that is open (useObjectActions holds it; null = none) */
export type ObjectDialog = { kind: 'create' } | { kind: 'delete'; item: SidebarItem; source?: Element | null }

type Props = { dialog: ObjectDialog | null; onClose: () => void }

/**
 * The objects' dialogs (sidebar rows, Dashboard cards): create an object card, delete (renaming happens in
 * place). Each one is mounted only while open, so its form starts fresh every time (closing unmounts it).
 */
export default function ObjectDialogs({ dialog, onClose }: Props) {
  if (!dialog) return null
  switch (dialog.kind) {
    case 'create':
      return <NameDialog title="New object" submitLabel="Create" onSubmit={(name) => createObjectOf('object', name, { description: '' })} onClose={onClose} />
    case 'delete':
      return <DeleteDialog item={dialog.item} source={dialog.source} onClose={onClose} />
  }
}

type NameDialogProps = {
  title: string
  submitLabel: string
  onSubmit: (name: string) => void
  onClose: () => void
}

/** A name field: Enter or the button saves; disabled while empty */
function NameDialog({ title, submitLabel, onSubmit, onClose }: NameDialogProps) {
  const formId = useId()
  const [name, setName] = useState('')
  const trimmed = name.trim()
  const valid = trimmed.length > 0

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!valid) return
    onSubmit(trimmed)
    onClose()
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form={formId} disabled={!valid}>
            {submitLabel}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={submit}>
        <TextField
          label="Name"
          value={name}
          maxLength={MAX_NAME}
          onChange={(e) => setName(e.target.value)}
          data-autofocus
        />
      </form>
    </Modal>
  )
}

const KIND_NAME = { map: 'map', object: 'object card' } as const

/** Asks first. `source`: its sidebar row, which burns down in the embers once deleted */
export function DeleteDialog({ item, source = null, onClose }: { item: SidebarItem; source?: Element | null; onClose: () => void }) {
  return (
    <Modal
      open
      onClose={onClose}
      title={`Delete ${KIND_NAME[item.kind]}`}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="secondary"
            className="text-danger"
            onClick={() => {
              burnDown(source)
              snapshotRows()
              deleteObject(item.id)
              onClose()
            }}
          >
            Delete
          </Button>
        </>
      }
    >
      <p className="text-body">Delete "{item.name}"? This can't be undone.</p>
    </Modal>
  )
}
