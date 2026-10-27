import type { ComponentProps } from 'react'
import { BANNER_HEIGHT, BANNER_INK, BANNER_PADDING, BANNER_SLICE, BANNER_SPRITE } from './bannerSprite'

type Props = ComponentProps<'div'> & {
  /** Size of one pixel of the ribbon on screen (px): 2 is the Dark Fantasy UI's own size */
  unit?: number
}

/**
 * The Dark Fantasy UI's Banner: a paper ribbon around one title or word, dark ink on it, as wide as what is inside it. Its ends are a
 * 9-slice sprite, so the middle repeats to fit.
 */
export default function Banner({ unit = 2, className = '', style, ...div }: Props) {
  const px = (n: number) => `${n * unit}px`
  return (
    <div
      className={`inline-flex items-center border-0 border-solid border-transparent ${className}`}
      style={{
        height: px(BANNER_HEIGHT),
        padding: BANNER_PADDING.map(px).join(' '),
        borderImage: `${BANNER_SPRITE} ${BANNER_SLICE.join(' ')} fill / ${BANNER_SLICE.map(px).join(' ')} repeat stretch`,
        color: BANNER_INK,
        ...style,
      }}
      {...div}
    />
  )
}
