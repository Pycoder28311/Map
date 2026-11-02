// How things on the map grow with the zoom, as roads on Google Maps do: gently, with the square root of the zoom, between half and three
// times their size at zoom 1. A line's or border's width (render.ts screenWidth), a text's size and a pin's size all follow it. Pure
// (zoomSize.test.ts).

/** How many times bigger than at zoom 1 something looks on the screen at this zoom */
export const zoomGrowth = (scale: number) => Math.min(Math.max(Math.sqrt(scale), 0.5), 3)

/**
 * What a text or a pin is multiplied by in board units to look `zoomGrowth` times bigger on the screen: 1 at zoom 1, under 1 when zoomed
 * in (the map grows faster than they do), over 1 when zoomed out. A text that keeps its size on the screen (`fixedSize`) uses 1 / scale instead
 */
export const sizeFactor = (scale: number) => (scale > 0 ? zoomGrowth(scale) / scale : 1)
