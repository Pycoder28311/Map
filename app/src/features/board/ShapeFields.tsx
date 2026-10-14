import RangeField from '../../components/ui/fields/RangeField'
import FillFields from './FillFields'
import ShapeGrid from './ShapeGrid'
import { SHAPE_PARAM, shapeParamDefault } from './shapes'
import type { Fill, ShapeType } from './types'

export type ShapeValues = { shape: ShapeType; param: number; fill: Fill | null }

type Props = {
  value: ShapeValues
  /** `commit` false: still moving (preview it) */
  onChange: (patch: Partial<ShapeValues>, commit: boolean) => void
}

/** What makes a shape its own: which one, its one number (corner radius, star points) and its fill. Used by the pen and a selected shape */
export default function ShapeFields({ value, onChange }: Props) {
  const spec = SHAPE_PARAM[value.shape]
  const fill = value.fill
  return (
    <div className="flex flex-col gap-3">
      <ShapeGrid value={value.shape} onPick={(shape) => onChange({ shape, param: shapeParamDefault(shape) }, true)} />
      {spec && <RangeField label={spec.label} value={value.param} min={spec.min} max={spec.max} onLive={(param) => onChange({ param }, false)} onCommit={(param) => onChange({ param }, true)} />}
      <FillFields fill={fill} onChange={(next, commit) => onChange({ fill: next }, commit)} />
    </div>
  )
}
