// The pointer each drawing tool has over the board: a crosshair with a small mark of what the tool makes (hot spot in the middle).
// The hand (over something the tool can pick) is the browser's own.
const cross = '<path d="M12 3v7M12 14v7M3 12h7M14 12h7" />'

const MARKS = {
  line: '<path d="M16 21l5-5" />',
  border: '<path d="M16 20l2-4 3 1 0 3z" />',
  point: '<circle cx="19" cy="18" r="2.2" />',
} as const

const make = (mark: string) => {
  // Drawn twice, wide in white and thin in black, so it reads on any colour
  const body = (stroke: string, width: number) => `<g fill="none" stroke="${stroke}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round">${cross}${mark}</g>`
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">${body('#fff', 3.4)}${body('#111', 1.4)}</svg>`
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}") 12 12, crosshair`
}

const cursors = { line: make(MARKS.line), border: make(MARKS.border), point: make(MARKS.point) }

/** The CSS cursor for a tool that has its own, else undefined */
export const toolCursor = (tool: string): string | undefined => cursors[tool as keyof typeof cursors]
