import DropZones from './DropZones'
import { useWorkspace } from './useWorkspace'

/** Drop targets over a normal page that is a panel (e.g. /dashboard): dropping there combines with it */
export default function PageDropZones() {
  const { onWorkspace, canDropOn } = useWorkspace()
  if (onWorkspace) return null // the panels have their own
  return <DropZones slot="a" enabled={canDropOn('a')} />
}
