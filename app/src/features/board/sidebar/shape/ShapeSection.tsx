import { LuRotateCw } from 'react-icons/lu'
import RangeField from '../../../../components/ui/fields/RangeField'
import NumberBox, { JOINED } from '../../NumberBox'
import ShapeGrid from '../../ShapeGrid'
import { SHAPE_PARAM, shapeParamDefault } from '../../shapes'
import type { Fill, ShapeType } from '../../types'
import FillSection from '../common/FillSection'
import SidebarSection from '../common/SidebarSection'

/** What the section shows: the picked shape (none: the pen draws lines), its number and its fill */
export type ShapeValues = { shape: ShapeType | null; param: number; fill: Fill | null }
/** What it changes (a shape is only ever picked, never set to none: that is `onClear`) */
export type ShapeChange = { shape?: ShapeType; param?: number; fill?: Fill | null }

type Props = {
  value: ShapeValues
  /** `commit` false: still moving (preview it) */
  onChange: (patch: ShapeChange, commit: boolean) => void
  /** Clicking the picked shape un-picks it (the pen only: a selected shape stays a shape) */
  onClear?: () => void
  /** Degrees; with `onRotation`, a picked shape can be turned (a selected shape only) */
  rotation?: number
  onRotation?: (rotation: number) => void
}

/** Which shape, and once one is picked its one number (corner radius, star points), how it is turned and its fill. Used by the pen and a selected shape */
export default function ShapeSection({ value, onChange, onClear, rotation, onRotation }: Props) {
  const { shape } = value
  const spec = shape ? SHAPE_PARAM[shape] : undefined
  return (
    <SidebarSection id="shape" title="Shape">
      <ShapeGrid value={shape} onPick={(next) => onChange({ shape: next, param: shapeParamDefault(next) }, true)} onClear={onClear} />
      {shape && (
        <>
          {spec && <RangeField label={spec.label} value={value.param} min={spec.min} max={spec.max} onLive={(param) => onChange({ param }, false)} onCommit={(param) => onChange({ param }, true)} />}
          {onRotation && rotation !== undefined && (
            <label className={`${JOINED} min-w-20`} title="Turn the shape (degrees)">
              <span className="flex items-center p-1">
                <LuRotateCw aria-hidden className="size-(--btn-icon-size) shrink-0 text-fg-muted" />
              </span>
              <NumberBox value={rotation} min={-360} max={360} label="Turn the shape, in degrees" onCommit={onRotation} />
            </label>
          )}
          <FillSection fill={value.fill} onChange={(fill, commit) => onChange({ fill }, commit)} />
        </>
      )}
    </SidebarSection>
  )
}
