import { useState } from 'react'
import { LuArchive, LuColumns2, LuCopy, LuFolderInput, LuPencil, LuPin, LuPinOff, LuTrash2, LuUnlink } from 'react-icons/lu'
import { archiveWithEffect } from '../../components/layout/sidebar/sidebarDropState'
import type { TreeMenuGroup } from '../../components/ui/tree/types'
import { duplicateObject, togglePin, usePins } from '../../mocks/projectsStore'
import type { SidebarItem } from '../../mocks/sidebarTree'
import type { PanelRef } from '../workspace/types'
import { useWorkspace } from '../workspace/useWorkspace'
import ObjectDialogs, { type ObjectDialog } from './ObjectDialogs'

type MenuOptions = {
  /** Its panel (for "Remove from screen" / "Add in screen") */
  panel?: PanelRef
  /** Starts renaming it in place (the row's or card's own editing) */
  onRename: () => void
  /** Its element on screen: what falls into the trash when it's archived */
  element: () => Element | null
}

/**
 * An object's actions, the same wherever it's shown (a sidebar row, a Dashboard card): the groups of
 * its ⋯ menu (Rename, Pin, Duplicate, Move to, Add in screen, Archive, Delete) and the
 * dialogs they open (render `dialogs` once where the menus are).
 */
export function useObjectActions() {
  const [dialog, setDialog] = useState<ObjectDialog | null>(null)
  const workspace = useWorkspace()
  const pins = usePins()

  const menuOf = (item: SidebarItem, { panel, onRename, element }: MenuOptions): TreeMenuGroup[] => {
    const isPinned = pins.includes(item.id)
    return [
      [
        // Shown as a pane: take it out of the panes
        ...(panel && workspace.isPane(panel) ? [{ label: 'Remove from screen', icon: LuUnlink, onClick: () => workspace.close(panel) }] : []),
        { label: 'Rename', icon: LuPencil, onClick: onRename },
        { label: isPinned ? 'Unpin' : 'Pin', icon: isPinned ? LuPinOff : LuPin, onClick: () => togglePin(item.id) },
      ],
      [
        { label: 'Duplicate', icon: LuCopy, onClick: () => duplicateObject(item.id) },
        // Projects stay top level: reordered by dragging, never moved into another
        ...(item.kind !== 'project' ? [{ label: 'Move to', icon: LuFolderInput, onClick: () => setDialog({ kind: 'move', item }) }] : []),
        // Open it as a panel next to what's on screen
        ...(panel ? [{ label: 'Add in screen', icon: LuColumns2, onClick: () => workspace.open(panel) }] : []),
        // Into the trash (restorable): it falls into the bin
        { label: 'Archive', icon: LuArchive, onClick: () => archiveWithEffect(item.id, element()) },
      ],
      [{ label: 'Delete', icon: LuTrash2, onClick: () => setDialog({ kind: 'delete', item, source: element() }), danger: true }],
    ]
  }

  return {
    menuOf,
    /** Opens a dialog (e.g. create) */
    openDialog: setDialog,
    dialogs: <ObjectDialogs dialog={dialog} onClose={() => setDialog(null)} />,
  }
}
