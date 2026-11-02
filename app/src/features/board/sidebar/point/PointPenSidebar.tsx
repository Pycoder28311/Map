import { setPointPen, usePointPen } from '../../pen'
import SidePanel from '../common/SidePanel'
import PinSection from './PinSection'

/** The Point tool's sidebar: what the next pin looks like (not undoable, not part of any map). The selected point's sidebar without what a pin that is not on the map yet has no use for */
export default function PointPenSidebar() {
  const pen = usePointPen()
  return (
    <SidePanel label="Point options">
      <PinSection first icon={pen.icon} color={pen.color} onIcon={(icon) => setPointPen({ icon })} onColor={(color) => setPointPen({ color })} />
      <p className="text-small text-fg-muted">Click on the map to place a pin. Click a pin to edit it.</p>
    </SidePanel>
  )
}
