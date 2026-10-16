import { LuShapes } from 'react-icons/lu'
import ValueBar, { spreadPresets } from '../../../../components/ui/fields/ValueBar'
import ShapeGrid from '../../ShapeGrid'
import { SHAPE_PARAM, shapeParamDefault } from '../../shapes'
import { ROW, pick, type BorderSectionProps } from './borderRows'

/** The pen's Shape way of the border (an element of the ways list): the shape grid and its number when picked */
export default function BorderShapeSection({ value, onChange }: BorderSectionProps) {
  const { style, shape, param } = value
  const spec = shape ? SHAPE_PARAM[shape] : undefined
  return (
    <li>
      <button
        type="button"
        aria-pressed={shape !== null}
        onClick={() => onChange({ shape: shape ?? 'rect', param: shape ? param : shapeParamDefault('rect'), style: { ...style, way: 'straight', amount: 0 } }, true)}
        className={`${ROW} ${pick(shape !== null)}`}
      >
        <LuShapes className="size-7 shrink-0" />
        <span className="text-body">Shape</span>
      </button>
      {shape && (
        <div className="mt-1.5 flex flex-col gap-2 ps-2">
          <ShapeGrid value={shape} onPick={(next) => onChange({ shape: next, param: shapeParamDefault(next) }, true)} />
          {spec && (
            <ValueBar
              label={spec.label}
              value={param}
              min={spec.min}
              max={spec.max}
              defaultValue={spec.default}
              presets={spreadPresets(spec.min, spec.max)}
              grid={{ rows: 2, columns: 3 }}
              onLive={(next) => onChange({ param: next }, false)}
              onCommit={(next) => onChange({ param: next }, true)}
            />
          )}
        </div>
      )}
    </li>
  )
}
