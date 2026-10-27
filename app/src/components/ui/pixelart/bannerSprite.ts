// The Banner element of the Dark Fantasy UI project (its uiConfig.js, "5. Banner"): a paper ribbon for one title or word, drawn as a pixel-art
// sprite and stretched with a 9-slice `border-image`: its two ends keep their shape and the middle repeats to fit the text.
import { spriteUrl } from './spriteUrl'

const PALETTE: Record<string, string> = {
  P: '#a69a91',
  R: '#8e847b',
  S: '#554840',
} // paper, rim, shadow
/** The ink of text on it */
export const BANNER_INK = '#251c22'
/** The ends' size in pixels: top, right, bottom, left (the ribbon is turned over sideways from the original, so its curl is on the left: 20 and 19 swap) */
export const BANNER_SLICE = [0, 20, 0, 19] as const
/**
 * The space between the edge and the text, in pixels: top, right, bottom, left. The ends are drawn inside it (they are as wide as BANNER_SLICE), so
 * left and right are the ends plus 2: the ribbon is as wide as its text and nothing more
 */
export const BANNER_PADDING = [6, 22, 7, 21] as const

const ROWS: readonly string[] = [
  '....................................................................................................................PPPPP..',
  '....................................................................................................................PPPPPP.',
  '.....................................................................................................................PPPPPP',
  '.....................................................................................................................RPPPPP',
  '....................................................................................................................RRPPPPP',
  '..................................................................................................................RRRRRPPPP',
  '.............RRRRRPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPRRRRRRRPPPPPPPPRRRRRRPPPPPPPPPPPPPPPPPPPPPPPPPPRRRRPPPPPPPPPPPPPPRRRRPPPP',
  '........PPPPPPPPRRRPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPRRRPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPRRPPPPPPPPPPPPPPPRRRRPPPP',
  '........PPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPRPPPPPPPPPPPPPPPPRRRPPPP',
  '.......RPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPRRRPPPP',
  '......RRPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPRRRPPPP',
  '.....RRRRPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPRRRPPPP',
  '.....RPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPRRRPPPP',
  '....RPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPRRRPPPP',
  '....RPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPRRRPPPP',
  '....PPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPRRRPPPP',
  '....PPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPRRRPPPP',
  '....PPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPRRRPPPP',
  '....PPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPRRRPPPP',
  '....PPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPRRRPPPPP',
  '....PPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPRRRPPPP.',
  '....PPPPPPPPPPPPPPPPPPPPPPPPRRPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPRRRPPPP.',
  '....PPPPPPPPPPPPPPPPPPPPPPPRRPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPRPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPRRRPPPP..',
  '....PPPPPPPPPPPPPPPPPPPPPRRRRPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPRRPPPPPPPPPPPPPPPRRRPPPPPPPPPPPPPPPPPPRRPPPP....',
  '....PPPPPPPPPPPPPPPPPPPPRRRRPPPPPPPPPPPPPPRRRPPPPPPPPPPPPPPPPPPPPPPPPPPPPPRRPPPPPPPPPPPPPPPPPRRRRRPPPPPPPPPPPPPPPPPPP......',
  '....PPPPPPPPPPPPPPPPPPPRRRRRRPPPPPPPPPPPPPPRRRPPPPPPPPPPPPPPRPPRRRPPPPPPRRRPPPPPPPPPPPPPPPPPPPRRRRRRRPPPPPPPPPPPPPP........',
  '....PPPPPRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRR..........',
  '....PPPRRRRSS..............................................................................................................',
  '....PPRRRSSSSSS............................................................................................................',
  '....PRRRSSSSSSS............................................................................................................',
  '.....RRRRSSSSSSS...........................................................................................................',
  '......RRRRRSSSSS...........................................................................................................',
  '.........RRRRRRR...........................................................................................................',
]

const flipped = ROWS.map((row) => [...row].reverse().join(''))
export const BANNER_SPRITE = spriteUrl(flipped, PALETTE)
/** The ribbon's height in pixels */
export const BANNER_HEIGHT = ROWS.length
