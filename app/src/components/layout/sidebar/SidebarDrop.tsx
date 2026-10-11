import type { ReactNode } from 'react'
import { useDropZone } from '../../../features/drag/objectDrop'
import { rowZone, trashZone } from './sidebarDropState'

/**
 * The sidebar's drop zones on the app's drop system: rows (move, pin) and the trash bin (archive).
 * Objects dragged from anywhere (the sidebar or a pane's list) land the same way.
 */
export default function SidebarDropProvider({ children }: { children: ReactNode }) {
  useDropZone('row', rowZone)
  useDropZone('trash', trashZone)
  return <>{children}</>
}
