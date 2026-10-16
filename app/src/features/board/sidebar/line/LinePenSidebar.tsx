import { setPen, usePen } from '../../pen'
import PointToolButton from '../common/PointToolButton'
import SidePanel from '../common/SidePanel'
import ShapeSection, { type ShapeChange } from '../shape/ShapeSection'
import LineArrowsSection from './LineArrowsSection'
import LineColourSection from './LineColourSection'
import LineShadowSection from './LineShadowSection'
import LineStrokeSection from './LineStrokeSection'
import LineTypeSection from './LineTypeSection'
import LineWaySection from './LineWaySection'

/** The Line tool's card at the top right: what the next line or shape is drawn with (not undoable, not part of any map) */
export default function LinePenSidebar({ pointTool, onPointTool }: { pointTool: boolean; onPointTool: () => void }) {
  const pen = usePen()
  const section = { style: pen.style, onChange: (style: typeof pen.style) => setPen({ style }) }
  const shapeActive = pen.shape !== null
  return (
    <SidePanel label="Line options">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-heading">Line</h2>
        <PointToolButton on={pointTool} onToggle={onPointTool} what="line" />
      </div>
      <div className="flex flex-col gap-3">
        <LineColourSection {...section} title={shapeActive ? 'Border colour' : 'Basic'} minThickness={shapeActive ? 0 : 1} roads />
        <LineTypeSection {...section} />
        <ShapeSection
          value={{ shape: pen.shape, param: pen.param, fill: pen.fill }}
          onChange={(patch: ShapeChange) => setPen(patch)}
          onClear={() => setPen({ shape: null })}
        />
        <LineWaySection {...section} shapeActive={shapeActive} onWayPicked={() => setPen({ shape: null })} />
        <LineArrowsSection {...section} />
        <LineStrokeSection {...section} />
        <LineShadowSection {...section} />
      </div>
    </SidePanel>
  )
}
