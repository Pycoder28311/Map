import { Parser } from 'htmlparser2'
import { isSafeImageSrc, isSafeLink } from './rich-text-policy'

/**
 * Cleans the HTML of a note before it is stored (an allowlist: whatever is not listed is dropped). Pure (sanitize-html.test.ts).
 * Run on every save: clients are not trusted, so the database only ever holds clean HTML.
 */

/** Tags kept, as the rich-text editor writes them */
const TAGS = new Set([
  'p', 'br', 'strong', 'em', 'u', 's', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'blockquote', 'code', 'pre', 'hr', 'a', 'span', 'img',
])
const VOID = new Set(['br', 'hr', 'img', 'input'])
/** Tags dropped together with everything inside them (others only lose the tag and keep their words) */
const DROP_WITH_CONTENT = new Set(['script', 'style', 'iframe', 'object', 'embed', 'template', 'noscript', 'textarea', 'title', 'svg', 'math', 'head'])

/** The only CSS a span keeps: a size, and a colour */
const SIZE = /^\d{1,3}(?:\.\d{1,2})?(?:px|em|rem|%)$/
const COLOUR = /^(?:#[0-9a-f]{3,8}|rgba?\(\s*[\d.]+%?(?:\s*,\s*[\d.]+%?){2,3}\s*\)|[a-z]{3,20})$/i

const escapeText = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const escapeAttr = (s: string) => escapeText(s).replace(/"/g, '&quot;')

/** A span's style, cut down to the allowed font-size and color, or null */
function safeStyle(raw: string | undefined): string | null {
  const kept: string[] = []
  for (const declaration of (raw ?? '').split(';')) {
    const at = declaration.indexOf(':')
    if (at === -1) continue
    const name = declaration.slice(0, at).trim().toLowerCase()
    const value = declaration.slice(at + 1).trim()
    if ((name === 'font-size' && SIZE.test(value)) || (name === 'color' && COLOUR.test(value))) kept.push(`${name}: ${value}`)
  }
  return kept.length ? kept.join('; ') : null
}

/**
 * The checklist the editor writes (Tiptap's TaskList / TaskItem), kept only in exactly this shape:
 *   <ul data-type="taskList"><li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>…</p></div></li></ul>
 * `label`, `input` and `div` are allowed only at their place in it, and with no other attribute than the ones named here.
 */
type Part = 'taskList' | 'taskItem' | 'taskLabel'

/** Whether a tag outside TAGS is one of the checklist's own, given the tag it sits in */
function isTaskTag(tag: string, parent: Part | undefined, attribs: Record<string, string>): boolean {
  if (tag === 'label' || tag === 'div') return parent === 'taskItem'
  if (tag === 'input') return parent === 'taskLabel' && attribs.type === 'checkbox'
  return false
}

/** The text is HTML from the editor when it starts with a tag; otherwise it is plain text */
const isHtml = (text: string) => /^\s*<[a-z]/i.test(text)

/** The HTML to store: only the allowed tags and attributes. Plain text becomes one paragraph per line */
export function sanitizeRichText(text: string): string {
  if (text.trim() === '') return ''
  if (!isHtml(text)) {
    return text
      .split('\n')
      .map((line) => `<p>${escapeText(line.replace(/\r$/, ''))}</p>`)
      .join('')
  }

  let out = ''
  let dropping = 0
  // One entry per open tag: whether its tag was written (so its closing tag is, too)
  const open: { tag: string; written: boolean; dropped: boolean; part?: Part }[] = []

  const parser = new Parser({
    onopentag(tag, attribs) {
      const dropped = dropping > 0 || DROP_WITH_CONTENT.has(tag)
      if (dropped) dropping++
      // The tag this one sits in, if it was written: the checklist's pieces check their place against it
      const parent = open.at(-1)
      const parentPart = parent?.written ? parent.part : undefined
      const written = !dropped && (TAGS.has(tag) || isTaskTag(tag, parentPart, attribs))
      const entry: (typeof open)[number] = { tag, written, dropped }
      open.push(entry)
      if (!written) return
      let attrs = ''
      if (tag === 'ul' && attribs['data-type'] === 'taskList') {
        entry.part = 'taskList'
        attrs = ' data-type="taskList"'
      } else if (tag === 'li' && attribs['data-type'] === 'taskItem' && parentPart === 'taskList') {
        entry.part = 'taskItem'
        attrs = ` data-type="taskItem" data-checked="${attribs['data-checked'] === 'true' ? 'true' : 'false'}"`
      } else if (tag === 'label') {
        entry.part = 'taskLabel'
      } else if (tag === 'input') {
        attrs = ` type="checkbox"${'checked' in attribs ? ' checked="checked"' : ''}`
      } else if (tag === 'img') {
        // Only the app's own stored images; any other picture (an outside address, data:) is dropped with its tag
        if (!isSafeImageSrc(attribs.src)) {
          entry.written = false
          return
        }
        const alt = (attribs.alt ?? '').slice(0, 200)
        attrs = ` src="${escapeAttr(attribs.src)}"${alt ? ` alt="${escapeAttr(alt)}"` : ''}`
      } else if (tag === 'a') {
        const href = attribs.href?.trim()
        if (isSafeLink(href)) attrs = ` href="${escapeAttr(href!)}" target="_blank" rel="noopener noreferrer nofollow"`
      } else if (tag === 'span') {
        const style = safeStyle(attribs.style)
        if (style) attrs = ` style="${escapeAttr(style)}"`
      }
      out += `<${tag}${attrs}>`
    },
    onclosetag(tag) {
      const entry = open.pop()
      if (!entry) return
      if (entry.dropped) dropping--
      if (entry.written && !VOID.has(tag)) out += `</${tag}>`
    },
    ontext(data) {
      if (dropping === 0) out += escapeText(data)
    },
  })
  parser.write(text)
  parser.end()
  // Nothing but empty tags (an empty paragraph): no text at all. A picture or a rule is content too
  return /[^\s]/.test(out.replace(/<[^>]*>/g, '')) || /<(?:hr|img)\b/.test(out) ? out : ''
}
