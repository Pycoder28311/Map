import { useId, useState, type FormEvent } from 'react'
import { LuStickyNote } from 'react-icons/lu'
import { burnDown } from '../../components/layout/sidebar/burnDown'
import { snapshotRows } from '../../components/ui/tree/rowFlip'
import Button from '../../components/ui/buttons/Button'
import TextField from '../../components/ui/fields/TextField'
import Modal from '../../components/ui/overlays/Modal'
import { canPlace, findObject } from '../../mocks/projects'
import { createMap, createNote, createProject, deleteObject, getObjects, moveObject, subtreeIds, useMockObjects } from '../../mocks/projectsStore'
import { KIND_ICON, type SidebarItem } from '../../mocks/sidebarTree'

const MAX_NAME = 100

/** Where a new object goes */
export type CreateParent = { kind: 'projects' } | { kind: 'notes' } | { kind: 'project'; id: string; name: string }

/** The object dialog that is open (useObjectActions holds it; null = none) */
export type ObjectDialog =
  | { kind: 'create'; parent: CreateParent }
  | { kind: 'move'; item: SidebarItem }
  | { kind: 'delete'; item: SidebarItem; source?: Element | null }

type Props = { dialog: ObjectDialog | null; onClose: () => void }

const CREATE: Record<CreateParent['kind'], { title: (parent: CreateParent) => string; create: (parent: CreateParent, name: string) => void }> = {
  projects: { title: () => 'New project', create: (_, name) => createProject(name) },
  notes: { title: () => 'New note', create: (_, name) => createNote(name) },
  project: {
    title: (p) => `New map in ${(p as { name: string }).name}`,
    create: (p, name) => createMap((p as { id: string }).id, name),
  },
}

/**
 * The objects' dialogs (sidebar rows, Dashboard cards): create, move to, delete (renaming happens in
 * place). Each one is mounted only while open, so its form starts fresh every time (closing unmounts it).
 */
export default function ObjectDialogs({ dialog, onClose }: Props) {
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

/**
 * Where it may go (canPlace) other than where it is: the projects, the folders (for an article), and
 * Notes (no project); a click moves it there
 */
function MoveDialog({ item, onClose }: { item: SidebarItem; onClose: () => void }) {
  const objects = useMockObjects()
  const containers = objects.filter(
    (o) => (o.kind === 'project' || o.kind === 'folder') && o.id !== item.id && o.id !== item.parentId && findObject(o.id) && canPlace(item.kind, o.kind),
  )
  const targets = [
    ...containers.map((o) => ({ id: o.id as string | null, name: o.name, icon: KIND_ICON[o.kind] })),
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

const KIND_NAME = { project: 'project', map: 'map', note: 'note', article: 'article', object: 'object card', folder: 'folder' } as const

/** Asks first; a project goes with everything in it. `source`: its sidebar row, which burns down in the embers once deleted */
export function DeleteDialog({ item, source = null, onClose }: { item: SidebarItem; source?: Element | null; onClose: () => void }) {
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
      <p className="text-body">
        Delete "{item.name}"{inside > 0 && ` and the ${inside} ${inside === 1 ? 'item' : 'items'} in it`}? This can't be
        undone.
      </p>
    </Modal>
  )
}
