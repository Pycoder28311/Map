// The road textures a line can have (saved as the index, so new ones are only ever added at the end). A road is painted as layers
// on top of each other along the line: each as wide as a share of the line's thickness, in the line's colour, a shade of it or its own colour,
// plain or dashed (dashes are in units of the thickness). Pure (roadTextures.test.ts).

export type RoadLayer = {
  /** The layer's width as a share of the line's thickness */
  width: number
  /** The line's colour, a darker or lighter shade of it (-1…1), or a colour of its own */
  color: 'line' | { shade: number } | string
  /** Dash and gap, in thicknesses; absent: unbroken */
  dash?: [number, number]
  cap?: 'butt' | 'round'
}

export type RoadTexture = { label: string; layers: RoadLayer[] }

export const ROADS: RoadTexture[] = [
  { label: 'None', layers: [] },
  {
    label: 'Paved road',
    layers: [
      { width: 1, color: { shade: -0.55 } },
      { width: 0.8, color: 'line' },
      { width: 0.07, color: '#ffffff', dash: [0.9, 0.7] },
    ],
  },
  {
    label: 'Highway',
    layers: [
      { width: 1, color: { shade: -0.6 } },
      { width: 0.82, color: 'line' },
      { width: 0.08, color: '#facc15' },
    ],
  },
  {
    label: 'Dirt track',
    layers: [
      { width: 1, color: { shade: -0.35 } },
      { width: 0.8, color: 'line' },
      { width: 0.22, color: { shade: 0.35 }, dash: [0.02, 0.5], cap: 'round' },
    ],
  },
  {
    label: 'Cobblestone',
    layers: [
      { width: 1, color: { shade: -0.5 } },
      { width: 0.86, color: 'line' },
      { width: 0.62, color: { shade: 0.3 }, dash: [0.18, 0.32], cap: 'round' },
    ],
  },
  {
    label: 'Railway',
    layers: [
      { width: 1, color: { shade: -0.3 }, dash: [0.14, 0.5] },
      { width: 0.22, color: 'line' },
    ],
  },
  {
    label: 'Trail',
    layers: [{ width: 0.55, color: 'line', dash: [1.1, 0.8] }],
  },
]

/** `#rrggbb` mixed toward black (amount < 0) or white (amount > 0) */
export function shade(color: string, amount: number): string {
  const n = parseInt(color.slice(1), 16)
  const mix = (c: number) => Math.round(amount < 0 ? c * (1 + amount) : c + (255 - c) * amount)
  return `#${[n >> 16, (n >> 8) & 255, n & 255].map((c) => mix(c & 255).toString(16).padStart(2, '0')).join('')}`
}

/** The colour a layer is painted in for a line of this colour */
export const roadLayerColour = (layer: RoadLayer, line: string) => (layer.color === 'line' ? line : typeof layer.color === 'string' ? layer.color : shade(line, layer.color.shade))
