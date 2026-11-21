import { useMemo } from 'react'
import { backdropStyle } from './nightBackdrop'

/**
 * The Dashboard's background in the dark theme: a misty pixel-art night at the top of the page (sky, stars, moon, a vine, hills) over a
 * cool blue-slate base with a faint grain (nightBackdrop.ts). It fills its parent (the page, `relative`) behind the content, which follows it
 * in the page; the light theme keeps its plain background.
 */
export default function NightBackdrop() {
  const style = useMemo(() => backdropStyle(), [])
  return <div aria-hidden style={style} className="pointer-events-none absolute inset-0 hidden dark:block" />
}
