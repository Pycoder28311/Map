import { LABELS } from '../../pointLabels'
import type { PointLabel } from '../../types'

/** The pin's label (what kind of place it is): a drop-down, for a selected point and for the Point tool */
export default function PointLabelSection({ label, onChange }: { label: PointLabel; onChange: (label: PointLabel) => void }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-small text-fg-muted">Label</span>
      <select
        value={label}
        onChange={(e) => onChange(e.target.value as PointLabel)}
        className="h-(--field-h) rounded-(--field-radius) border border-line-strong bg-surface px-(--field-px) text-body"
      >
        {LABELS.map((l) => (
          <option key={l.id} value={l.id}>
            {l.name}
          </option>
        ))}
      </select>
    </label>
  )
}
