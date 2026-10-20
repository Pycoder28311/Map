import type { ReactNode } from 'react'
import { useDropZone } from '../../../features/drag/objectDrop'
import { trashZone } from './sidebarDropState'

/**
 * The sidebar's drop zone on the app's drop system: the trash bin (archive). Items dragged from anywhere (the sidebar or a pane's
 * list) land the same way.
 */
export default function SidebarDropProvider({ children }: { children: ReactNode }) {
  useDropZone('trash', trashZone)
  return <>{children}</>
}
