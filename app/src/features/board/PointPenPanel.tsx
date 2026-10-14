import PinPicker from './PinPicker'
import { LABELS, defaultsOf } from './pointLabels'
import { setPointPen, usePointPen } from './pen'
import SidePanel from './SidePanel'
import type { PointLabel } from './types'

/** The Point tool's sidebar: what the next pin looks like (not undoable, not part of any map) */
export default function PointPenPanel() {
  const pen = usePointPen()
  return (
    <SidePanel label="Point options">
      <h2 className="text-heading">Point</h2>
      <p className="text-small text-fg-muted">Click on the map to place a pin. Click a pin to edit it.</p>
      <label className="flex flex-col gap-1">
        <span className="text-small text-fg-muted">Label</span>
        <select
          value={pen.label}
          onChange={(e) => setPointPen({ label: e.target.value as PointLabel, ...defaultsOf(e.target.value as PointLabel) })}
          className="h-(--field-h) rounded-(--field-radius) border border-line-strong bg-surface px-(--field-px) text-body"
        >
          {LABELS.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
      </label>
      <PinPicker icon={pen.icon} color={pen.color} onIcon={(icon) => setPointPen({ icon })} onColor={(color) => setPointPen({ color })} />
    </SidePanel>
  )
}
