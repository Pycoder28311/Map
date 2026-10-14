import { SHAPE_LABEL, shapeParamDefault } from './shapes'
import { shapeSample } from './samples'
import StyleSample from './StyleSample'
import { SHAPE_TYPES, type ShapeType } from './types'

type Props = { value: ShapeType | null; onPick: (shape: ShapeType) => void }

/** The shapes in three columns, like Paint's */
export default function ShapeGrid({ value, onPick }: Props) {
  return (
    <ul className="grid grid-cols-3 gap-1.5">
      {SHAPE_TYPES.map((shape) => (
        <li key={shape}>
          <button
            type="button"
            aria-pressed={value === shape}
            aria-label={SHAPE_LABEL[shape]}
            title={SHAPE_LABEL[shape]}
            onClick={() => onPick(shape)}
            className={`flex w-full items-center justify-center rounded-(--field-radius) border py-1 transition-colors ${value === shape ? 'border-accent bg-accent/10' : 'border-line hover:bg-fill'}`}
          >
            <StyleSample object={shapeSample(shape, 56, 40, shapeParamDefault(shape))} width={56} height={40} />
          </button>
        </li>
      ))}
    </ul>
  )
}
