import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import TitleInput from '../../../components/ui/fields/TitleInput'
import { measureText } from '../../../lib/measureText'
import { TITLE_MAX } from './pageConfig'

type Props = {
  /** The title it opens on (not followed afterwards) */
  start: string
  /** A reader's page: shown, not changed */
  readOnly: boolean
  /** The editor's placeholder (a reader's empty title says "Untitled article") */
  placeholder: string
  autoFocus: boolean
  onChange: (title: string) => void
}

/** The ribbon's pixels (px): its swallowtail and its fold are drawn in steps of this */
const PX = 4
/** The ribbon's height (px): a little taller than the title input (TitleInput xl, h-14) */
const HEIGHT = 68
/** Its outline's thickness (px) */
const BORDER = 4
/** The ribbon's cloth: dark red leather, as the books' (cards/book.ts), plain, with one thick gold outline */
const RIBBON = {
  cloth: '#7e3922',
  /** its tail, coming round from behind: the same cloth, a little in shade */
  tail: '#6b2f1b',
  outline: '#c9a14a',
  /** its back, seen where it folds round the frame's edge and where the tail turns to the front */
  back: '#3e180c',
  text: '#f1e3c4',
  placeholder: '#c9a98a',
  shade: '#4d1f11',
} as const

/** The tail at its right end: how far it reaches past the band (px), how much lower it hangs, and how far behind the band it starts */
const TAIL_W = 60
const DROP = 4 * PX
const TUCK = 4 * PX
/** How deep the swallowtail cut into the tail's end is (px); its steps are fine (2px), so its two points come to sharp tips */
const NOTCH = 30
const TIP_PX = 2
/** The tail's shape: square where it comes from behind the band, a swallowtail cut into its right end, the two points sharp */
function tailShape() {
  const steps = HEIGHT / 2 / TIP_PX
  // the row k fine pixels from the top (and the same from the bottom) is cut this far in from the right
  const cut = (k: number) => `calc(100% - ${Math.round((k * NOTCH) / (steps - 1))}px)`
  const pts = ['0 0']
  for (let k = 0; k < steps; k++) pts.push(`${cut(k)} ${k * TIP_PX}px`, `${cut(k)} ${(k + 1) * TIP_PX}px`)
  for (let k = steps - 1; k >= 0; k--) pts.push(`${cut(k)} ${HEIGHT - (k + 1) * TIP_PX}px`, `${cut(k)} ${HEIGHT - k * TIP_PX}px`)
  pts.push('0 100%')
  return `polygon(${pts.join(', ')})`
}
const TAIL = tailShape()
/** Where the tail turns to the front: a dark staircase under the band's right end, from its foot down to the tail's top (TUCK wide, DROP tall) */
const TURN = `polygon(0 0, 100% 0, ${[...Array(TUCK / PX).keys()]
  .flatMap((k) => [`100% ${(k + 1) * PX}px`, `${(k + 1) * PX}px ${(k + 1) * PX}px`])
  .join(', ')}, 0 0)`
/** Its fold under its left end: the ribbon's back going round the frame's edge, a pixel staircase */
const FOLD_W = 3 * PX
const FOLD = `polygon(${[...Array(FOLD_W / PX).keys()].flatMap((k) => [`${k * PX}px ${k * PX}px`, `${(k + 1) * PX}px ${k * PX}px`]).join(', ')}, ${FOLD_W}px 0, ${FOLD_W}px ${FOLD_W}px, 0 ${FOLD_W}px, 0 0)`
/** Its outline all round its shape, and its shadow on the page under it */
const OUTLINE = `drop-shadow(${BORDER}px 0 0 ${RIBBON.outline}) drop-shadow(-${BORDER}px 0 0 ${RIBBON.outline}) drop-shadow(0 ${BORDER}px 0 ${RIBBON.outline}) drop-shadow(0 -${BORDER}px 0 ${RIBBON.outline}) drop-shadow(0 ${PX}px 0 rgb(0 0 0 / 0.35))`

/**
 * The title on a cloth ribbon (a banner) that comes in from the left: out from the text box's frame, its back showing where it folds round
 * the frame's edge, the title on it where the text begins. At its right end it turns: its tail comes round from behind, a little lower, its
 * back showing where it turns to the front, and ends in a swallowtail with two sharp points. A thick gold outline round it all. As wide as the title's words
 */
export default function ArticleTitle({ start, readOnly, placeholder, autoFocus, onChange }: Props) {
  const [title, setTitle] = useState(start)
  // The input is as wide as its words: measured in the font it has now (it grows to a heading once there is text), a few px for the caret
  const input = useRef<HTMLInputElement>(null)
  const [width, setWidth] = useState<number | null>(null)
  const shown = title || (readOnly ? 'Untitled article' : 'Title')
  useLayoutEffect(() => {
    const el = input.current
    if (!el) return
    const measure = () => {
      const css = getComputedStyle(el)
      setWidth(Math.ceil(measureText(`${css.fontStyle} ${css.fontWeight} ${css.fontSize} ${css.fontFamily}`, shown)) + 6)
    }
    measure()
    // Again once its size has changed (it grows to a heading as it gets focus or text: a short transition) and once the fonts are in
    const late = window.setTimeout(measure, 250)
    void document.fonts?.ready.then(measure)
    el.addEventListener('transitionend', measure)
    return () => {
      window.clearTimeout(late)
      el.removeEventListener('transitionend', measure)
    }
  }, [shown])
  // It starts at the box's inner edge: back over the page's left padding (an editor's has room for the sections' ⠿), the title where the text begins
  const [pull, pad] = readOnly ? ['-ms-4', 'ps-4'] : ['-ms-11', 'ps-11']
  return (
    <div className={`relative flex min-w-0 max-w-full ${pull}`} style={{ marginBottom: FOLD_W + DROP, marginRight: TAIL_W }}>
      <div aria-hidden className="absolute left-0 top-full" style={{ width: FOLD_W, height: FOLD_W, background: RIBBON.back, clipPath: FOLD }} />
      <div className="relative flex min-w-0 max-w-full" style={{ filter: OUTLINE }}>
        {/* The tail, behind the band: from under its right end out past it, lower; where it turns to the front, its back */}
        <div aria-hidden className="absolute" style={{ left: `calc(100% - ${TUCK}px)`, top: DROP, width: TAIL_W + TUCK, height: HEIGHT, background: RIBBON.tail, clipPath: TAIL }} />
        <div aria-hidden className="absolute z-10" style={{ left: `calc(100% - ${TUCK}px)`, top: HEIGHT, width: TUCK, height: DROP, background: RIBBON.back, clipPath: TURN }} />
        <div
          className={`relative z-10 flex min-w-0 max-w-full items-center pe-6 ${pad}`}
          style={
            {
              height: HEIGHT,
              background: RIBBON.cloth,
              // its own gold edge along its foot and its right end, over the tail behind it
              boxShadow: `inset -${BORDER}px 0 0 ${RIBBON.outline}, inset 0 -${BORDER}px 0 ${RIBBON.outline}`,
              '--color-fg': RIBBON.text,
              '--color-fg-subtle': RIBBON.placeholder,
              textShadow: `0 2px 0 ${RIBBON.shade}`,
            } as CSSProperties
          }
        >
          <TitleInput
            size="xl"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value)
              onChange(e.target.value)
            }}
            placeholder={readOnly ? 'Untitled article' : placeholder}
            aria-label="Title"
            maxLength={TITLE_MAX}
            readOnly={readOnly}
            autoFocus={autoFocus}
            ref={input}
            // As wide as what is in it (measured in its own font; the placeholder while empty)
            style={width ? { width } : undefined}
            className="min-w-0 max-w-full"
          />
        </div>
      </div>
    </div>
  )
}
