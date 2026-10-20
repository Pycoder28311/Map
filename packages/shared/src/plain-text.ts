// Plain text from the editor's HTML, and the short preview of a text that lists show. Pure (plain-text.test.ts).
// No imports on purpose: the backfill script loads this file alone.

/** Longest preview kept (characters, the ellipsis not counted) */
export const PREVIEW_LENGTH = 150

const ENTITIES: Record<string, string> = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&nbsp;': ' ' }

/** The text is HTML from the editor when it starts with a tag; otherwise it is plain text */
const isHtml = (text: string) => /^\s*<[a-z]/i.test(text)

/** HTML → its words, one line per paragraph, heading or list item. Plain text stays as it is */
export function htmlToPlain(text: string | undefined): string {
  if (!text) return ''
  if (!isHtml(text)) return text
  return text
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|h[1-6]|li|blockquote|pre)>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&(?:amp|lt|gt|quot|#39|nbsp);/g, (entity) => ENTITIES[entity])
    .split('\n')
    .map((line) => line.trimEnd())
    .filter(Boolean) // a list item holds a paragraph: two closing tags, one line
    .join('\n')
}

/**
 * The preview of a text: its words as one line (whitespace collapsed), cut at the last word that fits in `max` characters
 * and ended with "…" when something was left out. Plain text, never HTML: show it as text. '' when the text has no words.
 */
export function previewOf(content: string | undefined, max = PREVIEW_LENGTH): string {
  const words = htmlToPlain(content).replace(/\s+/g, ' ').trim()
  // Only the start is split into characters (not UTF-16 units, so an emoji is never cut in half): enough to fill the preview
  const head = words.slice(0, max * 2 + 2)
  const chars = Array.from(head)
  if (head.length === words.length && chars.length <= max) return words

  const cut = chars.slice(0, max)
  const nextIsSpace = chars[max] === ' '
  const lastSpace = cut.lastIndexOf(' ')
  // Back up to the end of a whole word, unless that would throw most of the preview away (one very long word)
  const kept = nextIsSpace || lastSpace < max * 0.6 ? cut : cut.slice(0, lastSpace)
  return `${kept.join('').trimEnd()}…`
}
