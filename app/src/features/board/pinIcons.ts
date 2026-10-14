// The pin's shape and the small pictures in it: 24×24 SVG paths, used by the canvas (Path2D) and by React (<svg>) alike.
import type { PinIcon } from './types'

export const PIN_ICON_PATHS: Record<PinIcon, { name: string; path: string }> = {
  pin: { name: 'Pin', path: 'M12 6a4 4 0 1 0 0 8 4 4 0 0 0 0-8z' },
  city: { name: 'City', path: 'M3 21V9h6v4h4V4h8v17zM6 12v2h2v-2zm0 4v2h2v-2zm10-8v2h2V8zm0 4v2h2v-2zm0 4v2h2v-2z' },
  building: { name: 'Building', path: 'M5 21V3h14v18h-4v-5H9v5zM8 6v2h2V6zm6 0v2h2V6zm-6 4v2h2v-2zm6 0v2h2v-2z' },
  mountain: { name: 'Mountain', path: 'M2 20 9 6l4 7 3-4 6 11z' },
  water: { name: 'Water', path: 'M12 2C8 8 5 11 5 15a7 7 0 0 0 14 0c0-4-3-7-7-13z' },
  flag: { name: 'Flag', path: 'M5 3h2v18H5zm3 1h12l-3 4 3 4H8z' },
  star: { name: 'Star', path: 'm12 2 3 6.5 7 .8-5.2 4.8 1.5 7-6.3-3.6L5.7 21l1.5-7L2 9.3l7-.8z' },
  tree: { name: 'Tree', path: 'M12 2 5 12h4l-4 6h6v4h2v-4h6l-4-6h4z' },
  globe: { name: 'Globe', path: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 2c1.5 2 2.5 4.5 2.5 8s-1 6-2.5 8c-1.5-2-2.5-4.5-2.5-8S10.500 6 12 4zM4.200 10h15.600v1.500H4.200z' },
  anchor: { name: 'Anchor', path: 'M11 2h2v3h3v2h-3v2.100a6 6 0 0 1 5 5.900h2l-3 4-3-4h2a4 4 0 0 0-8 0h2l-3 4-3-4h2a6 6 0 0 1 5-5.900V7H8V5h3z' },
  home: { name: 'Home', path: 'M12 3 2 12h3v9h5v-6h4v6h5v-9h3z' },
  heart: { name: 'Heart', path: 'M12 21C5 15 2 12 2 8.500A5 5 0 0 1 12 6a5 5 0 0 1 10 2.500C22 12 19 15 12 21z' },
}

/** The teardrop, 28 wide and 36 tall, its tip at (14, 36) */
export const PIN_BODY = 'M14 36C14 36 2 22 2 13.500a12 12 0 0 1 24 0C26 22 14 36 14 36z'
export const PIN_WIDTH = 28
export const PIN_HEIGHT = 36
