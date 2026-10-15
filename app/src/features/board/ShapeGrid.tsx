import { useState } from 'react'
import { SHAPE_LABEL, shapeParamDefault } from './shapes'
import { shapeSample } from './samples'
import StyleSample from './StyleSample'
import { SHAPE_TYPES, type ShapeType } from './types'

type Props = {
  value: ShapeType | null
  onPick: (shape: ShapeType) => void
  /** Clicking the picked shape un-picks it (the pen goes back to lines) */
  onClear?: () => void
}

const COLUMNS = 3
/** The rows shown before "Show more" */
const ROWS = 2

/** The shapes in three columns, like Paint's: the first two rows, the rest behind "Show more" (open while the picked shape is in them) */
export default function ShapeGrid({ value, onPick, onClear }: Props) {
  const [more, setMore] = useState(() => value !== null && SHAPE_TYPES.indexOf(value) >= COLUMNS * ROWS)
  const shown = more ? SHAPE_TYPES : SHAPE_TYPES.slice(0, COLUMNS * ROWS)
  return (
    <div className="flex flex-col gap-1.5">
      <ul className="grid grid-cols-3 gap-1.5">
        {shown.map((shape) => (
          <li key={shape}>
            <button
              type="button"
              aria-pressed={value === shape}
              aria-label={SHAPE_LABEL[shape]}
              title={SHAPE_LABEL[shape]}
              onClick={() => (value === shape && onClear ? onClear() : onPick(shape))}
              className={`flex w-full items-center justify-center rounded-(--field-radius) border py-1 transition-colors ${value === shape ? 'border-accent bg-accent/10' : 'border-line hover:bg-fill'}`}
            >
              <StyleSample object={shapeSample(shape, 56, 40, shapeParamDefault(shape))} width={56} height={40} />
            </button>
          </li>
        ))}
      </ul>
      {SHAPE_TYPES.length > COLUMNS * ROWS && (
        <button type="button" aria-expanded={more} onClick={() => setMore(!more)} className="cursor-pointer self-center text-small text-fg-muted hover:text-fg">
          {more ? 'Show less' : 'Show more'}
        </button>
      )}
    </div>
  )
}
