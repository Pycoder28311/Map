import url from '../../assets/dashboard-background-pastel.jpg'

/** How dark the layer over the picture is: 0 shows the picture as it is, 1 hides it (black) */
export const DASHBOARD_OVERLAY_OPACITY = 0

/** How much darker the page gets around the three columns, on top of the layer above (0–1): the darkest it is at their middle, fading smoothly out to the sides */
export const DASHBOARD_COLUMNS_OVERLAY_OPACITY = 0.5

/**
 * How fast that extra darkness fades out: how far from the middle of the columns to their edge (0–100, in %) it stays at full strength before it starts
 * to fade. Low (0): it fades from the very middle, slowly and softly; high (90): it stays dark almost to the edge and drops quickly there
 */
export const DASHBOARD_COLUMNS_FADE_START = 30

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
