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

/** The ribbon's pixels (px): its swallowtail, its fold and its outline are drawn in steps of this */
const PX = 4
/** The ribbon's height (px): the title input's (TitleInput xl, h-14) */
const HEIGHT = 56
/** How deep the swallowtail cut into its right end is (px) */
const NOTCH = 6 * PX
/** The ribbon's cloth: dark red leather, as the books' (cards/book.ts), lit along its top, shaded along its bottom, a gold stitch near each edge */
const RIBBON = {
  cloth: '#7e3922',
  lit: '#9a492d',
  shade: '#612a18',
  stitch: '#a17b2f',
  outline: '#1a0b06',
  /** its back, seen where it folds round the frame's edge */
  back: '#3e180c',
  text: '#f1e3c4',
  placeholder: '#c9a98a',
} as const
const CLOTH = `linear-gradient(to bottom, ${RIBBON.lit} 0 ${PX}px, transparent ${PX}px calc(100% - ${PX}px), ${RIBBON.shade} calc(100% - ${PX}px)),
  linear-gradient(to bottom, transparent 0 ${2 * PX}px, ${RIBBON.stitch} ${2 * PX}px ${2 * PX + 2}px, transparent ${2 * PX + 2}px calc(100% - ${2 * PX + 2}px), ${RIBBON.stitch} calc(100% - ${2 * PX + 2}px) calc(100% - ${2 * PX}px), transparent calc(100% - ${2 * PX}px)),
  ${RIBBON.cloth}`

/** The ribbon's shape: square at its left (where it comes out from the frame), a swallowtail cut into its right end, in pixel steps */
function ribbonShape() {
  const steps = HEIGHT / 2 / PX
  // the row k pixels from the top (and the same from the bottom) is cut this far in from the right
  const cut = (k: number) => `calc(100% - ${Math.round((k * NOTCH) / (steps - 1))}px)`
  const pts = ['0 0']
  for (let k = 0; k < steps; k++) pts.push(`${cut(k)} ${k * PX}px`, `${cut(k)} ${(k + 1) * PX}px`)
  for (let k = steps - 1; k >= 0; k--) pts.push(`${cut(k)} ${HEIGHT - (k + 1) * PX}px`, `${cut(k)} ${HEIGHT - k * PX}px`)
  pts.push('0 100%')
  return `polygon(${pts.join(', ')})`
}
const SHAPE = ribbonShape()
/** Its fold under its left end: the ribbon's back going round the frame's edge, a pixel staircase */
const FOLD_W = 3 * PX
const FOLD = `polygon(${[...Array(FOLD_W / PX).keys()].flatMap((k) => [`${k * PX}px ${k * PX}px`, `${(k + 1) * PX}px ${k * PX}px`]).join(', ')}, ${FOLD_W}px 0, ${FOLD_W}px ${FOLD_W}px, 0 ${FOLD_W}px, 0 0)`
/** Its outline, a pixel wide all round its shape, and its shadow on the page under it */
const OUTLINE = `drop-shadow(2px 0 0 ${RIBBON.outline}) drop-shadow(-2px 0 0 ${RIBBON.outline}) drop-shadow(0 2px 0 ${RIBBON.outline}) drop-shadow(0 -2px 0 ${RIBBON.outline}) drop-shadow(0 ${PX}px 0 rgb(0 0 0 / 0.35))`

/**
 * The title on a cloth ribbon (a banner) that comes in from the left: out from the text box's frame, its back showing where it folds round
 * the frame's edge, the title on it where the text begins, its right end cut as a swallowtail. As wide as the title's words
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
    <div className={`relative flex min-w-0 max-w-full ${pull}`} style={{ marginBottom: FOLD_W }}>
      <div aria-hidden className="absolute left-0 top-full" style={{ width: FOLD_W, height: FOLD_W, background: RIBBON.back, clipPath: FOLD }} />
      <div className="flex min-w-0 max-w-full" style={{ filter: OUTLINE }}>
        <div
          className={`flex min-w-0 max-w-full items-center ${pad}`}
          style={
            {
              height: HEIGHT,
              paddingRight: NOTCH + 16,
              background: CLOTH,
              clipPath: SHAPE,
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
