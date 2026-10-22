import type { SVGProps } from 'react'

// The app's logo: a vintage globe (blue oceans, green land) on a brass stand, in pixel art (26×31 pixels). Each letter of ROWS is a pixel of PALETTE; `.` is empty.
// Drawn once as one path per colour, with crisp edges so the pixels stay square at any size. It sizes with its height (`className`).
const PALETTE: Record<string, string> = {
  G: '#4a9a30',
  M: '#a98530',
  N: '#7a5e1e',
  P: '#2f7a2f',
  R: '#3f8a2e',
  T: '#6aae3f',
  Y: '#9cc85a',
  a: '#a5dcf5',
  b: '#6bbcea',
  c: '#4797d6',
  g: '#6dbb45',
  k: '#a6d96a',
  m: '#d6b24f',
  o: '#1f4e79',
  p: '#3f8f3a',
  r: '#5fae3a',
  t: '#8ed05a',
  w: '#eefaff',
  y: '#c4e27c',
}

const ROWS = [
  '.............mmmm.........',
  '.......ooooooooommm.......',
  '.....ooaaaabbaaaoomm......',
  '....owwatkkkpppaaao.mm....',
  '...oawattkkkppTTTako.m....',
  '..oawaattgkyypTTaakkomm...',
  '.oaaaaagggyyyyaaabbkkomm..',
  '.oaaaaaaaaabbaaabbbkpo.m..',
  'oaaaaaaGyyypppgayyrppPom..',
  'oaaaaaGGyyypppggyyrrpPomm.',
  'oaaaaGGGGyypprggYYrrTTo.m.',
  'oaaaaGGGgPPPrrrrbYYcTTo.M.',
  'obbbbGgggPPPyrrcccYcTco.M.',
  'obbbbbbgggPPyyyccccccco.M.',
  'oaaaaaaaggkkyyyccccccco.M.',
  'oaaaaaaaakkkkyccccccccoMM.',
  'oaaaaaaabGkkkkccRRccccoM..',
  '.oaaaaabbGGGGGcccRccco.M..',
  '.oaaabbbbbGGGccccccccoMM..',
  '..obbbbbbbGGGccccccco.M...',
  '...obbbbcccGccccccco.MM...',
  '....obbccccccccccco.MM....',
  '.....oocccccccccoo.MM.....',
  '.......oocccccoo.MMM......',
  '.........ooooo.MMM........',
  '...........MMMMM..........',
  '...........mM.............',
  '...........mM.............',
  '........mmmmmmmm..........',
  '.......MMMMMMMMMM.........',
  '........NNNNNNNN..........',
]

const WIDTH = ROWS[0].length
const HEIGHT = ROWS.length

/** One path per colour: each horizontal run of the same letter is one rectangle */
const PATHS = Object.entries(PALETTE).map(([letter, fill]) => {
  let d = ''
  ROWS.forEach((row, y) => {
    for (let x = 0; x < WIDTH; ) {
      if (row[x] !== letter) {
        x++
        continue
      }
      let end = x
      while (row[end] === letter) end++
      d += `M${x} ${y}h${end - x}v1h-${end - x}z`
      x = end
    }
  })
  return { letter, fill, d }
})

/** The logo. Give it a height (e.g. `h-10`); the width follows */
export default function GlobeLogo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} shapeRendering="crispEdges" aria-hidden {...props}>
      {PATHS.map(({ letter, fill, d }) => (
        <path key={letter} fill={fill} d={d} />
      ))}
    </svg>
  )
}
