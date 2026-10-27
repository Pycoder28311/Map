// The ⋯ menu of an item of any resource, and the dialogs its actions open. The same wherever the item shows (a sidebar row, a list
// row, a Dashboard card, the Trash). What it offers follows from the resource: pin only if the resource has pinned items, a panel
// only if it can be opened as one.
import { useState, type ReactNode } from 'react'
import { LuArchive, LuColumns2, LuCopy, LuFolderInput, LuPencil, LuPin, LuPinOff, LuPlus, LuRotateCcw, LuTrash2 } from 'react-icons/lu'
import ResourceCreateDialog from '../../components/ui/resource/ResourceCreateDialog'
import ResourceDeleteDialog from '../../components/ui/resource/ResourceDeleteDialog'
import ResourceErrorDialog from '../../components/ui/resource/ResourceErrorDialog'
import ResourceMoveDialog from '../../components/ui/resource/ResourceMoveDialog'
import type { TreeMenuGroup } from '../../components/ui/tree/types'
import { parentTypeOf } from '../../features/dashboard/tree'
import { DRAFTED } from '../../features/dashboard/draftKinds'
import { useWorkspace } from '../../features/workspace/useWorkspace'
import { RESOURCES } from '../../resources/registry'
import type { AnyResource } from '../../resources/types'
import { useResourceActions } from './hooks'

/** What the menu needs to know of an item (a list item has all of it) */
export type MenuItem = { id: number | string; title: string; pinned?: boolean }

type MenuOptions = {
  /** Starts renaming it in place (the row's or card's own editing); without it there is no Rename */
  onRename?: () => void
  /** In the Trash: Restore and Delete for good only */
  trashed?: boolean
  /** Right before it is archived: where it shows is told to play its effect (the sidebar row falls into the Trash bin) */
  onArchiving?: () => void
  /** After it was archived (moved to the Trash; e.g. close what showed it) */
  onTrashed?: () => void
  /** The key that puts a new item first among its children (the sidebar shows them all; none: the server puts it first among all) */
  firstPosition?: () => string
  /** Add ▸ a folder or an object card inside it: the owner shows a draft (the sidebar's draft row). Without it, every kind opens its Create modal */
  onDraft?: (kind: AnyResource) => void
}

export function useResourceMenu(resource: AnyResource) {
  const actions = useResourceActions(resource)
  const workspace = useWorkspace()
  const [deleting, setDeleting] = useState<MenuItem | null>(null)
  const [moving, setMoving] = useState<MenuItem | null>(null)
  const [creating, setCreating] = useState<{ kind: AnyResource; initial: Record<string, unknown> } | null>(null)
  const [error, setError] = useState<string | null>(null)

  /** Runs an action; a failure opens the error dialog */
  const attempt = async (what: string, run: () => Promise<unknown>) => {
    try {
      await run()
    } catch (e) {
      setError(`Could not ${what}: ${e instanceof Error ? e.message : 'unknown error'}`)
    }
  }

  const duplicate = async (item: MenuItem) => {
    const full = await resource.api.get(item.id)
    const names = resource.ui.fields.map((field) => field.name)
    const heading = resource.ui.fields.find((field) => field.heading)?.name
    const input = Object.fromEntries(names.map((name) => [name, full[name]]))
    if (heading) input[heading] = `${item.title || resource.ui.untitled} (copy)`
    await actions.create(input)
  }

  /** What can be made inside an item that can be a parent (a folder, a project): the resources that can have it as their parent */
  const kindsIn = () => {
    const type = parentTypeOf(resource, RESOURCES)
    return { type, kinds: type ? RESOURCES.filter((r) => r.parents?.some((p) => p.type === type)) : [] }
  }

  /** The + menu of a card (a folder's): a list of what to create inside it, each opening its Create modal (a folder or an object card: `onDraft`, a draft card beside it). Empty when nothing can be made inside it */
  const addMenuOf = (item: MenuItem, onDraft?: (kind: AnyResource) => void): TreeMenuGroup[] => {
    const { type, kinds } = kindsIn()
    if (!type || kinds.length === 0) return []
    return [kinds.map((kind) => ({ label: kind.ui.label, icon: kind.ui.icon, onClick: () => (onDraft && DRAFTED.includes(kind.name) ? onDraft(kind) : setCreating({ kind, initial: { objectType: type, objectId: Number(item.id) } })) }))]
  }

  const menuOf = (item: MenuItem, { onRename, trashed = false, onTrashed, onArchiving, onDraft, firstPosition }: MenuOptions = {}): TreeMenuGroup[] => {
    if (trashed) {
      return [
        [{ label: 'Restore', icon: LuRotateCcw, onClick: () => void attempt('restore it', () => actions.restore(item.id)) }],
        [{ label: 'Delete for good', icon: LuTrash2, danger: true, onClick: () => setDeleting(item) }],
      ]
    }
    const panel = resource.surfaces.panel ? { type: resource.panelType, id: String(item.id) } : undefined
    const canPin = resource.ui.row.pinned !== undefined
    // An item that can be a parent (project, folder): Add ▸ what can be made inside it (notes and articles in their modal; folders and object cards as a draft)
    const { type: parentType, kinds } = kindsIn()
    const create = {
      label: 'Add',
      icon: LuPlus,
      onClick: () => {},
      submenu: kinds.map((kind) => ({
        label: kind.ui.label,
        icon: kind.ui.icon,
        onClick: () =>
          onDraft && DRAFTED.includes(kind.name) ? onDraft(kind) : setCreating({ kind, initial: { objectType: parentType, objectId: Number(item.id), ...(firstPosition ? { position: firstPosition() } : {}) } }),
      })),
    }
    return [
      [
        ...(onRename ? [{ label: 'Rename', icon: LuPencil, onClick: onRename }] : []),
        ...(canPin
          ? [{ label: item.pinned ? 'Unpin' : 'Pin', icon: item.pinned ? LuPinOff : LuPin, onClick: () => void attempt(item.pinned ? 'unpin it' : 'pin it', () => actions.update(item.id, { pinned: !item.pinned })) }]
          : []),
      ],
      // Add ▸ on its own, a line above and below it, under Pin
      ...(kinds.length > 0 ? [[create]] : []),
      [
        { label: 'Duplicate', icon: LuCopy, onClick: () => void attempt('duplicate it', () => duplicate(item)) },
        // An item that can have a parent (project, folder) goes into another: one update of its parent
        ...(resource.parents?.length ? [{ label: 'Move to…', icon: LuFolderInput, onClick: () => setMoving(item) }] : []),
        ...(panel ? [{ label: 'Add in screen', icon: LuColumns2, onClick: () => workspace.open(panel) }] : []),
        {
          label: 'Archive',
          icon: LuArchive,
          onClick: () =>
            void attempt('archive it', async () => {
              onArchiving?.()
              await actions.trash(item.id)
              onTrashed?.()
            }),
        },
      ],
      [{ label: 'Delete', icon: LuTrash2, danger: true, onClick: () => setDeleting(item) }],
    ].filter((group) => group.length > 0)
  }

  const dialogs: ReactNode = (
    <>
      {creating && <ResourceCreateDialog resource={creating.kind} initial={creating.initial} onClose={() => setCreating(null)} />}
      {moving && <ResourceMoveDialog resource={resource} item={moving} onClose={() => setMoving(null)} />}
      {deleting && <ResourceDeleteDialog resource={resource} item={deleting} onClose={() => setDeleting(null)} />}
      {error && <ResourceErrorDialog message={error} onClose={() => setError(null)} />}
    </>
  )

  return { menuOf, addMenuOf, dialogs, actions, attempt }
}
