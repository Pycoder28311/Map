import type { ComponentType } from 'react'
import { iconAnimations, type IconAnimation } from './iconAnimations'

/** A plain icon (e.g. from react-icons) moves as a whole when animated */
export type PlainIcon = ComponentType<{ className?: string }> & { layered?: false }

/** A layered icon (e.g. DownloadIcon) animates only its moving part */
export type LayeredIcon = ComponentType<{ className?: string; movingClassName?: string }> & { layered: true }

export type ButtonIcon = PlainIcon | LayeredIcon

const ICON_CLASS = 'size-(--btn-icon-size) shrink-0 ms-(--btn-icon-offset-start)'

/** The icon of a button, sized by the theme tokens, with its hover animation */
export default function IconSlot({ icon: Icon, animation = 'none' }: { icon: ButtonIcon; animation?: IconAnimation }) {
  const moving = iconAnimations[animation]
  if (Icon.layered) return <Icon className={ICON_CLASS} movingClassName={moving} />
  return <Icon className={`${ICON_CLASS} ${moving}`} />
}
