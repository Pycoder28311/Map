/**
 * A faint grid of dots behind the whole Dashboard, like drafting paper, fading out towards the top (where the pixel-art items are).
 * Only a theme that turns it on shows it (--dashboard-grid-display, styles/tokens.css). To drop it: delete this file, its line in
 * DashboardPage.tsx and the two tokens.
 */
export default function DashboardGrid() {
  return (
    <div
      aria-hidden
      style={{
        display: 'var(--dashboard-grid-display)',
        backgroundImage: 'radial-gradient(circle at 1px 1px, var(--dashboard-grid-color) 1px, transparent 1.5px)',
        backgroundSize: '24px 24px',
      }}
      className="pointer-events-none absolute inset-0 -z-10 [mask-image:linear-gradient(to_bottom,transparent,black_320px)]"
    />
  )
}
