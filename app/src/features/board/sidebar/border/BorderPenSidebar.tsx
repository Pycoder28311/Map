import { setBorderPen, useBorderPen } from '../../pen'
import PointToolButton from '../common/PointToolButton'
import SidePanel from '../common/SidePanel'
import BorderCountySection from './BorderCountySection'
import BorderFillSection from './BorderFillSection'
import BorderBasicSection from './BorderBasicSection'
import BorderShapeSection from './BorderShapeSection'
import BorderTypeSection from './BorderTypeSection'
import BorderWaySection from './BorderWaySection'

/** The Border tool's sidebar: what the next area is drawn with (not undoable, not part of any map) */
export default function BorderPenSidebar({ pointTool, onPointTool }: { pointTool: boolean; onPointTool: () => void }) {
  const pen = useBorderPen()
  const section = { value: pen, onChange: (patch: Parameters<typeof setBorderPen>[0]) => setBorderPen(patch) }
  return (
    <SidePanel label="Border options">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-heading">Border</h2>
        <PointToolButton on={pointTool} onToggle={onPointTool} what="border" />
      </div>
      <div className="flex flex-col gap-3">
        <BorderBasicSection {...section} roads />
        <BorderTypeSection {...section} />
        <BorderWaySection {...section} extraWays={<BorderShapeSection {...section} />} />
        <BorderFillSection {...section} />
        <BorderCountySection {...section} />
      </div>
    </SidePanel>
  )
}
