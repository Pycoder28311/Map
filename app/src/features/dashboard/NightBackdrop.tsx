import { useMemo } from 'react'
import sky from '../../assets/dashboard-sky.jpg'
import { BACKDROP, horizonStyle, lanternGlow, SKY_DIM, SKY_FADE_FROM, SKY_RATIO, VIGNETTE, woodStyle } from './nightBackdrop'

/** Where the lantern's light is centred (px down the page): on the note input and the Create buttons */
const LANTERN_AT = 560

/**
 * The Dashboard's background in the dark theme (nightBackdrop.ts): the night sky over the distant castle across the top of the page, as
 * wide as the page and a little darkened, ending at a dark horizon of hills and trees; below it a dark wooden table, a lantern's warm
 * light pooled on it round the input and the Create buttons; the page's corners darker. It fills its parent (the page, `relative`)
 * behind the content, which follows it in the page; the light theme keeps its plain background.
 */
export default function NightBackdrop() {
  const wood = useMemo(() => woodStyle(), [])
  const horizon = useMemo(() => horizonStyle(), [])
  const fade = `linear-gradient(to bottom, black ${SKY_FADE_FROM * 100}%, transparent 100%)`
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 hidden dark:block" style={{ backgroundColor: BACKDROP.base }}>
      {/* The wooden table, under the sky */}
      <div className="absolute inset-0" style={wood} />
      {/* The lantern's light on the table */}
      <div className="absolute inset-0" style={{ backgroundImage: lanternGlow(LANTERN_AT) }} />
      {/* The sky, ending at the horizon: the hills' silhouette lies over its fading foot, solid below into the table */}
      <div className="absolute inset-x-0 top-0" style={{ aspectRatio: String(SKY_RATIO) }}>
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `linear-gradient(rgb(0 0 0 / ${SKY_DIM}), rgb(0 0 0 / ${SKY_DIM})), url(${sky})`,
            maskImage: fade,
            WebkitMaskImage: fade,
          }}
        />
        <div className="absolute inset-x-0" style={{ ...horizon, top: `${SKY_FADE_FROM * 100 - 4}%` }} />
        {/* Under the hills, down to the sky's foot: the table's colour, easing into the wood below */}
        <div
          className="absolute inset-x-0 bottom-0"
          style={{ top: `calc(${SKY_FADE_FROM * 100 - 4}% + ${horizon.height})`, backgroundImage: `linear-gradient(${BACKDROP.base}, ${BACKDROP.base} 40%, transparent)` }}
        />
      </div>
      <div className="absolute inset-0" style={{ backgroundImage: VIGNETTE }} />
    </div>
  )
}
