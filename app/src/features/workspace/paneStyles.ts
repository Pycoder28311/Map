// The look of the workspace panels, in one place: change a value here and every panel follows.
// Inline styles (not Tailwind classes) because the gap is also used in the grid's calc().
import type { CSSProperties } from 'react'

/** Corner rounding of a panel (px) */
export const PANE_RADIUS = 12

/** Space between two panels (px) */
export const PANE_GAP = 6

/** Space between the panels and the edges of the app around them: sidebar, navbar, window (px) */
export const PANE_INSET = 6

/** A panel's outline */
export const PANE_BORDER = '1px solid var(--color-line)'

/** One panel (Pane) */
export const paneStyle: CSSProperties = { borderRadius: PANE_RADIUS, border: PANE_BORDER }

/** The highlight shown where a dragged item would land (DropZones) */
export const dropPreviewStyle: CSSProperties = { borderRadius: PANE_RADIUS }

/** The grid of panels (Workspace) */
export const paneGridStyle: CSSProperties = { gap: PANE_GAP }

/**
 * Rounding of the frame around the panels (px), shown only with 2+ panels.
 * A panel's radius + the inset: the frame's curve then runs parallel to the panel's own corner inside it.
 */
export const FRAME_RADIUS = PANE_RADIUS + PANE_INSET

/** The rounded frame holding the panels (Workspace); the bars' colour shows around its corners */
export const workspaceFrameStyle: CSSProperties = { borderRadius: FRAME_RADIUS, padding: PANE_INSET }
