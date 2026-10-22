// The look of the workspace panels, in one place: change a value here and every panel follows.
// Inline styles (not Tailwind classes) because the gap is also used in the grid's calc().
import type { CSSProperties } from 'react'

/** Corner rounding of a panel: the cards' --corner-lg (styles/tokens.css), so changing it there rounds the panels too */
export const PANE_RADIUS = 'var(--corner-lg)'

/** --corner-lg in px, for the few places that need a number (a shape's size); read when called, once the stylesheet is loaded */
export function paneRadiusPx() {
  const value = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--corner-lg'))
  return Number.isFinite(value) ? value : 8
}

/** Space between two panels (px) */
export const PANE_GAP = 6

/** Space between the panels and the edges of the app around them: sidebar, navbar, window (px) */
export const PANE_INSET = 6

/**
 * A panel's frame: a thick gray border (--pane-frame, --pane-frame-w in styles/tokens.css) with a very thin light line just outside it
 * (the outline, --pane-hairline: the hovered pane's turns blue, Pane)
 */
export const PANE_BORDER = 'var(--pane-frame-w) solid var(--pane-frame)'

/** One panel (Pane) */
export const paneStyle: CSSProperties = { borderRadius: PANE_RADIUS, border: PANE_BORDER, outline: '1px solid var(--pane-hairline)', outlineOffset: 0 }

/** The highlight shown where a dragged item would land (DropZones) */
export const dropPreviewStyle: CSSProperties = { borderRadius: PANE_RADIUS }

/** The area of panels (Workspace): the gap when stacked; --pane-radius rounds the small screens' scroll area */
export const paneGridStyle: CSSProperties = { gap: PANE_GAP, '--pane-radius': PANE_RADIUS } as CSSProperties

/**
 * Rounding of the frame around the panels, shown only with 2+ panels.
 * A panel's radius + the inset: the frame's curve then runs parallel to the panel's own corner inside it.
 */
export const FRAME_RADIUS = `calc(${PANE_RADIUS} + ${PANE_INSET}px)`

/** The same in px (PopoutLayer draws the page's corners under the navbar from a number) */
export const frameRadiusPx = () => paneRadiusPx() + PANE_INSET

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
