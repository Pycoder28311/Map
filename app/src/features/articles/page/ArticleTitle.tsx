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
/** How deep the swallowtail cut into its left end is (px) */
const NOTCH = 6 * PX
/** Its outline's thickness (px) */
const BORDER = 4
/** The ribbon's cloth: dark red leather, as the books' (cards/book.ts), plain, with one thick dark outline */
const RIBBON = {
  cloth: '#7e3922',
  outline: '#1a0b06',
  /** its back, seen where it folds round the frame's edge */
  back: '#3e180c',
  text: '#f1e3c4',
  placeholder: '#c9a98a',
  shade: '#4d1f11',
} as const

/** The ribbon's shape: square at its right (where it comes out from the frame), a swallowtail cut into its left end, in pixel steps */
function ribbonShape() {
  const steps = HEIGHT / 2 / PX
  // the row k pixels from the top (and the same from the bottom) is cut this far in from the left
  const cut = (k: number) => `${Math.round((k * NOTCH) / (steps - 1))}px`
  const pts = ['100% 0', '100% 100%']
  for (let k = 0; k < steps; k++) pts.push(`${cut(k)} ${HEIGHT - k * PX}px`, `${cut(k)} ${HEIGHT - (k + 1) * PX}px`)
  for (let k = steps - 1; k >= 0; k--) pts.push(`${cut(k)} ${(k + 1) * PX}px`, `${cut(k)} ${k * PX}px`)
  return `polygon(${pts.join(', ')})`
}
const SHAPE = ribbonShape()
/** Its fold under its right end: the ribbon's back going round the frame's edge, a pixel staircase */
const FOLD_W = 3 * PX
const FOLD = `polygon(0 0, ${FOLD_W}px 0, ${[...Array(FOLD_W / PX).keys()]
  .reverse()
  .flatMap((k) => [`${k * PX}px ${FOLD_W - k * PX}px`, `${k * PX}px ${FOLD_W - (k + 1) * PX}px`])
  .join(', ')}, 0 0)`
/** Its outline all round its shape, and its shadow on the page under it */
const OUTLINE = `drop-shadow(${BORDER}px 0 0 ${RIBBON.outline}) drop-shadow(-${BORDER}px 0 0 ${RIBBON.outline}) drop-shadow(0 ${BORDER}px 0 ${RIBBON.outline}) drop-shadow(0 -${BORDER}px 0 ${RIBBON.outline}) drop-shadow(0 ${PX}px 0 rgb(0 0 0 / 0.35))`

/**
 * The title on a cloth ribbon (a banner) that comes in from the right: out from the text box's frame, its back showing where it folds round
 * the frame's edge, its left end cut as a swallowtail. As wide as the title's words
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
  // It starts at the box's inner edge on the right, back over the page's right padding
  return (
    <div className="relative ms-auto -me-4 flex min-w-0 max-w-full" style={{ marginBottom: FOLD_W }}>
      <div aria-hidden className="absolute right-0 top-full" style={{ width: FOLD_W, height: FOLD_W, background: RIBBON.back, clipPath: FOLD }} />
      <div className="flex min-w-0 max-w-full" style={{ filter: OUTLINE }}>
        <div
          className="flex min-w-0 max-w-full items-center pe-4"
          style={
            {
              height: HEIGHT,
              paddingLeft: NOTCH + 16,
              background: RIBBON.cloth,
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
