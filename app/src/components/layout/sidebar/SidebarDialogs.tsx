import { useId, useState, type FormEvent } from 'react'
import { LuFolderKanban, LuStickyNote } from 'react-icons/lu'
import {
  createMap,
  createNote,
  createProject,
  deleteObject,
  getObjects,
  moveObject,
  subtreeIds,
  useMockProjects,
} from '../../../mocks/projectsStore'
import type { SidebarItem } from '../../../mocks/sidebarTree'
import Button from '../../ui/buttons/Button'
import TextField from '../../ui/fields/TextField'
import Modal from '../../ui/overlays/Modal'

const MAX_NAME = 100

/** Where a new object goes */
export type CreateParent = { kind: 'projects' } | { kind: 'notes' } | { kind: 'project'; id: string; name: string }

/** The sidebar dialog that is open (SidebarTree holds it; null = none) */
export type SidebarDialog =
  | { kind: 'create'; parent: CreateParent }
  | { kind: 'move'; item: SidebarItem }
  | { kind: 'delete'; item: SidebarItem }

type Props = { dialog: SidebarDialog | null; onClose: () => void }

const CREATE: Record<CreateParent['kind'], { title: (parent: CreateParent) => string; create: (parent: CreateParent, name: string) => void }> = {
  projects: { title: () => 'New project', create: (_, name) => createProject(name) },
  notes: { title: () => 'New note', create: (_, name) => createNote(name) },
  project: {
    title: (p) => `New map in ${(p as { name: string }).name}`,
    create: (p, name) => createMap((p as { id: string }).id, name),
  },
}

/**
 * The sidebar's dialogs: create, move to, delete (renaming happens in place, in the tree). Each one is
 * mounted only while open, so its form starts fresh every time (closing unmounts it).
 */
export default function SidebarDialogs({ dialog, onClose }: Props) {
  if (!dialog) return null
  switch (dialog.kind) {
    case 'create': {
      const { parent } = dialog
      const { title, create } = CREATE[parent.kind]
      return <NameDialog title={title(parent)} submitLabel="Create" onSubmit={(name) => create(parent, name)} onClose={onClose} />
    }
    case 'move':
      return <MoveDialog item={dialog.item} onClose={onClose} />
    case 'delete':
      return <DeleteDialog item={dialog.item} onClose={onClose} />
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

/** The other projects (and Notes, for an object inside a project); a click moves it there */
function MoveDialog({ item, onClose }: { item: SidebarItem; onClose: () => void }) {
  const projects = useMockProjects().filter((p) => p.id !== item.parentId)
  const targets = [
    ...projects.map((p) => ({ id: p.id as string | null, name: p.name, icon: LuFolderKanban })),
    ...(item.parentId ? [{ id: null, name: 'Notes (no project)', icon: LuStickyNote }] : []),
  ]

  return (
    <Modal open onClose={onClose} title={`Move "${item.name}" to`} size="sm">
      {targets.length === 0 ? (
        <p className="text-body text-fg-muted">No other place.</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {targets.map((target) => (
            <li key={target.id ?? 'notes'}>
              <Button
                variant="ghost"
                icon={target.icon}
                className="w-full justify-start"
                onClick={() => {
                  moveObject(item.id, { parentId: target.id })
                  onClose()
                }}
              >
                {target.name}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  )
}

const KIND_NAME = { project: 'project', map: 'map', note: 'note' } as const

/** Asks first; a project goes with everything in it */
export function DeleteDialog({ item, onClose }: { item: SidebarItem; onClose: () => void }) {
  const inside = subtreeIds(getObjects(), item.id).size - 1

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
              deleteObject(item.id)
              onClose()
            }}
          >
            Delete
          </Button>
        </>
      }
    >
      <p className="text-body">
        Delete "{item.name}"{inside > 0 && ` and the ${inside} ${inside === 1 ? 'item' : 'items'} in it`}? This can't be
        undone.
      </p>
    </Modal>
  )
}
