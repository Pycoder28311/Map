import { setBorderPen, useBorderPen } from '../../pen'
import SidePanel from '../common/SidePanel'
import BorderFillSection from './BorderFillSection'
import BorderBasicSection from './BorderBasicSection'
import BorderShapeSection from './BorderShapeSection'
import BorderTypeSection from './BorderTypeSection'
import BorderWaySection from './BorderWaySection'

/** The Border tool's sidebar: what the next area is drawn with (not undoable, not part of any map) */
export default function BorderPenSidebar() {
  const pen = useBorderPen()
  const section = { value: pen, onChange: (patch: Parameters<typeof setBorderPen>[0]) => setBorderPen(patch) }
  return (
    <SidePanel label="Border options">
      <h2 className="text-heading">Border</h2>
      <div className="flex flex-col gap-3">
        <BorderBasicSection {...section} />
        <BorderTypeSection {...section} />
        <BorderWaySection {...section} extraWays={<BorderShapeSection {...section} />} />
        <BorderFillSection {...section} />
      </div>
    </SidePanel>
  )
}
