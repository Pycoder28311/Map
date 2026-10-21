import type { ReactNode } from 'react'
import { useDropZone } from '../../../features/drag/objectDrop'
import { PLACE_ZONE, placeZone } from '../../../features/drag/placeDrop'
import { trashZone } from './sidebarDropState'

/**
 * The app's drop zones: the trash bin (archive) and the places in ordered lists (an object dropped before or after a row or card moves there, or
 * into a project or folder row). Items dragged from anywhere (the sidebar or a pane's
 * list) land the same way.
 */
export default function SidebarDropProvider({ children }: { children: ReactNode }) {
  useDropZone('trash', trashZone)
  useDropZone(PLACE_ZONE, placeZone)
  return <>{children}</>
}
