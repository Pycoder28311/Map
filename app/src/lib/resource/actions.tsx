// The ⋯ menu of an item of any resource, and the dialogs its actions open. The same wherever the item shows (a sidebar row, a list
// row, a Dashboard card, the Trash). What it offers follows from the resource: pin only if the resource has pinned items, a panel
// only if it can be opened as one.
import { useState, type ReactNode } from 'react'
import { LuColumns2, LuCopy, LuPencil, LuPin, LuPinOff, LuRotateCcw, LuTrash, LuTrash2 } from 'react-icons/lu'
import ResourceDeleteDialog from '../../components/ui/resource/ResourceDeleteDialog'
import ResourceErrorDialog from '../../components/ui/resource/ResourceErrorDialog'
import type { TreeMenuGroup } from '../../components/ui/tree/types'
import { useWorkspace } from '../../features/workspace/useWorkspace'
import type { AnyResource } from '../../resources/types'
import { useResourceActions } from './hooks'

/** What the menu needs to know of an item (a list item has all of it) */
export type MenuItem = { id: number | string; title: string; pinned?: boolean }

type MenuOptions = {
  /** Starts renaming it in place (the row's or card's own editing); without it there is no Rename */
  onRename?: () => void
  /** In the Trash: Restore and Delete for good only */
  trashed?: boolean
  /** After it was moved to the Trash (e.g. close what showed it) */
  onTrashed?: () => void
}

export function useResourceMenu(resource: AnyResource) {
  const actions = useResourceActions(resource)
  const workspace = useWorkspace()
  const [deleting, setDeleting] = useState<MenuItem | null>(null)
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

  const menuOf = (item: MenuItem, { onRename, trashed = false, onTrashed }: MenuOptions = {}): TreeMenuGroup[] => {
    if (trashed) {
      return [
        [{ label: 'Restore', icon: LuRotateCcw, onClick: () => void attempt('restore it', () => actions.restore(item.id)) }],
        [{ label: 'Delete for good', icon: LuTrash2, danger: true, onClick: () => setDeleting(item) }],
      ]
    }
    const panel = resource.surfaces.panel ? { type: resource.panelType, id: String(item.id) } : undefined
    const canPin = resource.ui.row.pinned !== undefined
    return [
      [
        ...(onRename ? [{ label: 'Rename', icon: LuPencil, onClick: onRename }] : []),
        ...(canPin
          ? [{ label: item.pinned ? 'Unpin' : 'Pin', icon: item.pinned ? LuPinOff : LuPin, onClick: () => void attempt(item.pinned ? 'unpin it' : 'pin it', () => actions.update(item.id, { pinned: !item.pinned })) }]
          : []),
      ],
      [
        { label: 'Duplicate', icon: LuCopy, onClick: () => void attempt('duplicate it', () => duplicate(item)) },
        ...(panel ? [{ label: 'Add in screen', icon: LuColumns2, onClick: () => workspace.open(panel) }] : []),
        {
          label: 'Move to Trash',
          icon: LuTrash,
          onClick: () =>
            void attempt('move it to the Trash', async () => {
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
      {deleting && <ResourceDeleteDialog resource={resource} item={deleting} onClose={() => setDeleting(null)} />}
      {error && <ResourceErrorDialog message={error} onClose={() => setError(null)} />}
    </>
  )

  return { menuOf, dialogs, actions, attempt }
}
