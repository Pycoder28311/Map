import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import sky from '../../assets/dashboard-sky.jpg'
import { BACKDROP, BACKDROP_PIXEL, SKY_DIM, SKY_FADE_FROM, SKY_RATIO, skyFadeMask, VIGNETTE, woodStyle } from './nightBackdrop'

/**
 * The Dashboard's background in the dark theme (nightBackdrop.ts): the night sky over the distant castle across the top of the page, as
 * wide as the page and a little darkened, its lower part crumbling in a pixel gradient into a dark wood-grain surface; the page's edges a
 * little darker. The fade's pixels are measured from the page's width (the picture's height follows it). It fills its parent (the page,
 * `relative`) behind the content, which follows it in the page; the light theme keeps its plain background.
 */
export default function NightBackdrop() {
  const wood = useMemo(() => woodStyle(), [])
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new ResizeObserver(() => setWidth(el.offsetWidth))
    observer.observe(el)
    setWidth(el.offsetWidth)
    return () => observer.disconnect()
  }, [])
  // The picture's height, where it starts to fade (on the pixel grid) and how many pixel rows the fade takes
  const height = width / SKY_RATIO
  const fadeTop = Math.round((height * SKY_FADE_FROM) / BACKDROP_PIXEL) * BACKDROP_PIXEL
  const rows = Math.max(1, Math.floor((height - fadeTop) / BACKDROP_PIXEL))
  const fade = useMemo(() => skyFadeMask(rows), [rows])
  const mask = {
    maskImage: `linear-gradient(black, black), ${fade.image}`,
    maskSize: `100% ${fadeTop}px, ${fade.w}px ${fade.h}px`,
    maskPosition: `0 0, 0 ${fadeTop}px`,
    maskRepeat: 'no-repeat, repeat-x',
  }
  return (
    <div ref={ref} aria-hidden className="pointer-events-none absolute inset-0 hidden dark:block" style={{ backgroundColor: BACKDROP.base }}>
      {/* The wood-grain surface, under the sky (which crumbles into it) */}
      <div className="absolute inset-0" style={wood} />
      <div
        className="absolute inset-x-0 top-0 bg-cover bg-center"
        style={{
          aspectRatio: String(SKY_RATIO),
          backgroundImage: `linear-gradient(rgb(0 0 0 / ${SKY_DIM}), rgb(0 0 0 / ${SKY_DIM})), url(${sky})`,
          ...mask,
          WebkitMaskImage: mask.maskImage,
          WebkitMaskSize: mask.maskSize,
          WebkitMaskPosition: mask.maskPosition,
          WebkitMaskRepeat: mask.maskRepeat,
        }}
      />
      <div className="absolute inset-0" style={{ backgroundImage: VIGNETTE }} />
    </div>
  )
}
