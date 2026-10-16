import { useState } from 'react'
import { LuBan } from 'react-icons/lu'
import { SHAPE_LABEL, shapeParamDefault } from './shapes'
import { shapeSample } from './samples'
import StyleSample from './StyleSample'
import { SHAPE_TYPES, type ShapeType } from './types'

type Props = {
  value: ShapeType | null
  onPick: (shape: ShapeType) => void
  /** Clicking the picked shape un-picks it (the pen goes back to lines), and a first option, None, does the same */
  onClear?: () => void
}

const COLUMNS = 3
/** The rows shown before "Show more" */
const ROWS = 2

/** The shapes in three columns, like Paint's, after None when shapes can be un-picked: the first two rows, the rest behind "Show more" (open while the picked shape is in them) */
export default function ShapeGrid({ value, onPick, onClear }: Props) {
  // None takes the first place, so one shape less fits in the rows shown first
  const first = onClear ? 1 : 0
  const fit = COLUMNS * ROWS - first
  const [more, setMore] = useState(() => value !== null && SHAPE_TYPES.indexOf(value) >= fit)
  const shown = more ? SHAPE_TYPES : SHAPE_TYPES.slice(0, fit)
  return (
    <div className="flex flex-col gap-1.5">
      <ul className="grid grid-cols-3 gap-1.5">
        {onClear && (
          <li>
            <button
              type="button"
              aria-pressed={value === null}
              aria-label="None"
              title="None: draw lines"
              onClick={onClear}
              className={`flex h-full min-h-12 w-full flex-col items-center justify-center gap-0.5 rounded-(--field-radius) border py-1 transition-colors ${value === null ? 'border-accent bg-accent/10' : 'border-line hover:bg-fill'}`}
            >
              <LuBan aria-hidden className="size-5 text-fg-muted" />
              <span className="text-small text-fg-muted">None</span>
            </button>
          </li>
        )}
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
      {SHAPE_TYPES.length > fit && (
        <button type="button" aria-expanded={more} onClick={() => setMore(!more)} className="cursor-pointer self-center text-small text-fg-muted hover:text-fg">
          {more ? 'Show less' : 'Show more'}
        </button>
      )}
    </div>
  )
}
