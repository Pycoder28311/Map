import { useLayoutEffect, useRef, useState } from 'react'
import TitleInput from '../../../components/ui/fields/TitleInput'
import CrackedPanel from '../../../components/ui/pixel/CrackedPanel'
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

/** The title on the same cracked panel as the map's name (the shared CrackedPanel), as wide as its words */
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
  return (
    <CrackedPanel seed="article-title" theme="app" cuts={4} depth={6} className="flex min-w-0 max-w-full" contentClassName="flex min-w-0 items-center px-3">
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
    </CrackedPanel>
  )
}
