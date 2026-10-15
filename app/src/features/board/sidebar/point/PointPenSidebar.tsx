import PinPicker from '../../PinPicker'
import { defaultsOf } from '../../pointLabels'
import { setPointPen, usePointPen } from '../../pen'
import SidePanel from '../common/SidePanel'
import PointLabelSection from './PointLabelSection'

/** The Point tool's sidebar: what the next pin looks like (not undoable, not part of any map) */
export default function PointPenSidebar() {
  const pen = usePointPen()
  return (
    <SidePanel label="Point options">
      <h2 className="text-heading">Point</h2>
      <p className="text-small text-fg-muted">Click on the map to place a pin. Click a pin to edit it.</p>
      <PointLabelSection label={pen.label} onChange={(label) => setPointPen({ label, ...defaultsOf(label) })} />
      <PinPicker icon={pen.icon} color={pen.color} onIcon={(icon) => setPointPen({ icon })} onColor={(color) => setPointPen({ color })} />
    </SidePanel>
  )
}
