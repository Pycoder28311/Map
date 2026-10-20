// A note's text is HTML (what the rich-text editor makes). Older notes hold plain text, so reading accepts both. Pure (noteHtml.test.ts).

const ENTITIES: Record<string, string> = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&nbsp;': ' ' }

const escapeHtml = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** Whether the text is HTML from the editor (starts with a tag) and not plain text */
const isHtml = (text: string) => /^\s*<[a-z]/i.test(text)

/** Text → HTML the editor can load: HTML stays as it is; plain text becomes one paragraph per line */
export function toHtml(text: string | undefined): string {
  if (!text) return ''
  if (isHtml(text)) return text
  return text
    .split('\n')
    .map((line) => `<p>${escapeHtml(line)}</p>`)
    .join('')
}

/** HTML → its words, one line per paragraph, heading or list item. Plain text stays as it is (search, previews, checklists) */
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

/** What is kept for the editor's HTML: '' when it holds no words (just an empty paragraph) */
export const cleanHtml = (html: string) => (htmlToPlain(html) === '' ? '' : html)
