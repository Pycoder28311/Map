// The sidebar's chains (SidebarChains.tsx; only a theme that turns them on shows them). Edit this file to move them,
// make them bigger or smaller, or fade them.

/** The sidebar's width when open (px): --sidebar-w in styles/tokens.css. The chains are placed within it. */
export const SIDEBAR_WIDTH = 224

/** One chain */
export type ChainConfig = {
  /** Which side of the sidebar `edge` counts from */
  side: 'left' | 'right'
  /** How far the chain is from that side (px; 0 is against the edge) */
  edge: number
  /** How big it is: the size of one of its pixels (px). 1 is tiny, 2 small, 3 big, 4 bigger. A chain is 5 pixels wide */
  size: number
  /** How faded it is: 0 is its full colour, 1 is gone. The fainter, the deeper it looks */
  fade: number
  /** Where it begins from the top of the sidebar (% of its height) and how long it is (%): 0 and 100 is the full height */
  top: number
  length: number
  /** How far down its pattern starts (px): chains with different values don't have their links at the same heights */
  offset: number
}

/**
 * The chains, the farthest first: one drawn later is in front of the ones before it. Here: the small one, a little right of
 * the big left one and partly behind it, then the big one against the left side (the biggest), then the big one on the right.
 */
export const CHAINS: ChainConfig[] = [
  { side: 'left', edge: 70, size: 2.5, fade: 0.5, top: 50, length: 50, offset: 9 },
  { side: 'left', edge: 25, size: 4, fade: 0.1, top: 0, length: 100, offset: 0 },
  { side: 'right', edge: 20, size: 3, fade: 0.2, top: 0, length: 100, offset: 14 },
]

/**
 * How faded the chains are along the sidebar's rows (the stretch from the first row to the last): 0 is no fade, 1 is gone.
 * This is on top of each chain's own `fade`.
 */
export const FADE_BESIDE_ROWS = 0.6

/**
 * A chain that doesn't reach an end of the sidebar (its `top` is below the top, or it stops short of the bottom) fades in
 * and out there instead of starting abruptly: over this share of its length (0 to 1).
 */
export const FADE_ENDS = 0.4

/**
 * Whether the chains look turned about 30° to the left, as if seen from an angle (like the chest on the Dashboard): a flat,
 * two-dimensional effect: each link has a darker copy a pixel to its right behind it, like the thickness of a block seen
 * from the side. The chains hang straight down either way. false draws them facing front, with no thickness.
 */
export const CHAINS_TURNED = true

/**
 * While an object is dragged (from the sidebar or anywhere), the chains slide up or down, each in a direction picked at
 * random when the drag starts. They go at full speed while the pointer is moving, and at DRAG_STILL_SPEED (a fraction of
 * it) while the object is held still. The deeper a chain, the a little faster it goes: from DRAG_SPEED_NEAR (fade 0) to
 * DRAG_SPEED_FAR (fade 1), in px per second. DRAG_STILL_AFTER_MS: how long the pointer must rest to count as still.
 * DRAG_RAMP_MS: how long they take to change speed, and to stop when the drag ends.
 */
export const DRAG_SPEED_NEAR = 60
export const DRAG_SPEED_FAR = 100
export const DRAG_STILL_SPEED = 0.5
export const DRAG_STILL_AFTER_MS = 150
export const DRAG_RAMP_MS = 450
