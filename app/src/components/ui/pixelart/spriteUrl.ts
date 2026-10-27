// Pixel art as an image for CSS: each letter of a row is a pixel of a palette, '.' is empty.

/** The sprite as a CSS `url(…)` of an SVG (one rectangle per run of pixels, hard edges) */
export function spriteUrl(rows: readonly string[], palette: Record<string, string>): string {
  const paths: Record<string, string[]> = {}
  rows.forEach((row, y) => {
    let x = 0
    while (x < row.length) {
      const letter = row[x]
      let end = x
      while (end < row.length && row[end] === letter) end++
      if (letter !== '.') (paths[letter] ??= []).push(`M${x} ${y}h${end - x}v1h-${end - x}z`)
      x = end
    }
  })
  const body = Object.entries(paths)
    .map(([letter, d]) => `<path fill='${palette[letter] ?? '#000000'}' d='${d.join('')}'/>`)
    .join('')
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${rows[0].length}' height='${rows.length}' viewBox='0 0 ${rows[0].length} ${rows.length}' shape-rendering='crispEdges'>${body}</svg>`
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`
}
