import CheckField from '../../../../components/ui/fields/CheckField'
import ColourField from '../../../../components/ui/fields/ColourField'
import { NumberField } from '../../NumberBox'
import type { Fill } from '../../types'

type Props = {
  fill: Fill | null
  /** The colour a new fill starts with */
  startColor?: string
  /** `commit` false: still moving (preview it) */
  onChange: (fill: Fill | null, commit: boolean) => void
}

const START = { color: '#93c5fd', opacity: 60 }

/** A shape's or an area's inside: on or off, its colour and how see-through it is */
export default function FillSection({ fill, startColor, onChange }: Props) {
  return (
    <div className="flex flex-col gap-3">
      <CheckField label="Fill" checked={fill !== null} onChange={(on) => onChange(on ? { ...START, ...(startColor ? { color: startColor } : {}) } : null, true)} />
      {fill && (
        <div className="flex flex-wrap items-stretch gap-1">
          <ColourField wide className="w-1/2" label="Fill colour" value={fill.color} onLive={(color) => onChange({ ...fill, color }, false)} onCommit={(color) => onChange({ ...fill, color }, true)} />
          <NumberField label="Fill opacity" suffix="%" value={fill.opacity} min={1} max={100} onCommit={(opacity) => onChange({ ...fill, opacity }, true)} />
        </div>
      )}
    </div>
  )
}
