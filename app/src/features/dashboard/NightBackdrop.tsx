import { useMemo } from 'react'
import sky from '../../assets/dashboard-sky.jpg'
import { BACKDROP, overlayStyle, SKY_DIM, SKY_FADE_FROM, SKY_RATIO } from './nightBackdrop'

/**
 * The Dashboard's background in the dark theme (nightBackdrop.ts): the night sky over the distant castle across the top of the page, as
 * wide as the page, a little darkened and fading into the cool blue-slate base below; over it all a faint pixel grain and darker edges.
 * It fills its parent (the page, `relative`) behind the content, which follows it in the page; the light theme keeps its plain background.
 */
export default function NightBackdrop() {
  const overlay = useMemo(() => overlayStyle(), [])
  const fade = `linear-gradient(to bottom, black ${SKY_FADE_FROM * 100}%, transparent 100%)`
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 hidden dark:block" style={{ backgroundColor: BACKDROP.base }}>
      <div
        className="absolute inset-x-0 top-0 bg-cover bg-center"
        style={{
          aspectRatio: String(SKY_RATIO),
          backgroundImage: `linear-gradient(rgb(0 0 0 / ${SKY_DIM}), rgb(0 0 0 / ${SKY_DIM})), url(${sky})`,
          maskImage: fade,
          WebkitMaskImage: fade,
        }}
      />
      <div className="absolute inset-0" style={overlay} />
    </div>
  )
}
