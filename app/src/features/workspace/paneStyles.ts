// The look of the workspace panels, in one place: change a value here and every panel follows.
// Inline styles (not Tailwind classes) because the gap is also used in the grid's calc().
import type { CSSProperties } from 'react'

/** Corner rounding of a panel (px): keep it equal to --corner-lg (styles/tokens.css), like the cards */
export const PANE_RADIUS = 8

/** Space between two panels (px) */
export const PANE_GAP = 6

/** Space between the panels and the edges of the app around them: sidebar, navbar, window (px) */
export const PANE_INSET = 6

/** A panel's outline (--pane-border: e.g. the hovered pane's colour, Pane) */
export const PANE_BORDER = '1px solid var(--pane-border, var(--color-line))'

/** One panel (Pane) */
export const paneStyle: CSSProperties = { borderRadius: PANE_RADIUS, border: PANE_BORDER }

/** The highlight shown where a dragged item would land (DropZones) */
export const dropPreviewStyle: CSSProperties = { borderRadius: PANE_RADIUS }

/** The area of panels (Workspace): the gap when stacked; --pane-radius rounds the small screens' scroll area */
export const paneGridStyle: CSSProperties = { gap: PANE_GAP, '--pane-radius': `${PANE_RADIUS}px` } as CSSProperties

/**
 * Rounding of the frame around the panels (px), shown only with 2+ panels.
 * A panel's radius + the inset: the frame's curve then runs parallel to the panel's own corner inside it.
 */
export const FRAME_RADIUS = PANE_RADIUS + PANE_INSET

/**
 * The rounded frame holding the panels (Workspace); the bars' colour shows around its corners. The
 * sidebar's light shadow falls inside it along its left edge (workspaceFrameShadowStyle); the navbar's
 * along its top comes from the navbar (its PopoutLayer draws these corners too, so it follows them)
 */
export const workspaceFrameStyle: CSSProperties = {
  borderRadius: FRAME_RADIUS,
  padding: PANE_INSET,
}

/** Inside the frame (clipped by its corners): the shadow, its top edge cut off above the frame */
export const workspaceFrameShadowStyle: CSSProperties = {
  borderRadius: FRAME_RADIUS,
  boxShadow: 'var(--chrome-shadow)',
}
