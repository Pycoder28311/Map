import BorderOptions from './BorderOptions'
import { setBorderPen, useBorderPen } from './pen'
import SidePanel from './SidePanel'

/** The Border tool's sidebar: what the next area is drawn with (not undoable, not part of any map) */
export default function BorderPenPanel() {
  const pen = useBorderPen()
  return (
    <SidePanel label="Border options">
      <h2 className="text-heading">Border</h2>
      <BorderOptions value={pen} withShape onChange={(patch) => setBorderPen(patch)} />
    </SidePanel>
  )
}
