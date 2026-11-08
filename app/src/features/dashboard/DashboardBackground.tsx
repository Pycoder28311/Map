import url from '../../assets/dashboard-background.jpg'

/** How dark the layer over the picture is: 0 shows the picture as it is, 1 hides it (black) */
export const DASHBOARD_OVERLAY_OPACITY = 0.8

/** A dark gray glow around the Dashboard's text and cards, so they stand out from the picture (a CSS `filter`: change its colour, blur and strength here) */
export const DASHBOARD_SHADE = 'drop-shadow(0 0 0px rgb(31 41 55 / 0.9)) drop-shadow(0 0 14px rgb(31 41 55 / 0.6))'

/**
 * The Dashboard's background: a picture (a night landscape) filling the page behind everything, under a dark layer
 * (DASHBOARD_OVERLAY_OPACITY). The picture stays where it is while the page scrolls over it. To drop it: delete this file, its line in
 * DashboardPage.tsx and the picture in assets.
 */
export default function DashboardBackground() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div style={{ backgroundImage: `url(${url})` }} className="absolute inset-0 bg-cover bg-center bg-fixed" />
      <div style={{ opacity: DASHBOARD_OVERLAY_OPACITY }} className="absolute inset-0 bg-black" />
    </div>
  )
}
