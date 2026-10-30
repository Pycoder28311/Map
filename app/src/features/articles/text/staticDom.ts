// The static text's places: a position of the document ⇄ a point in a section's element drawn without an editor (StaticSections).
// The element is the section's own HTML (DOMSerializer), so its text nodes hold the section's words in the same order: a place is
// found by counting characters.
import type { Node as PMNode } from '@tiptap/pm/model'

/** An element's text nodes, in order (every text node, however deep) */
export function* textNodes(el: Node): Generator<Text> {
  for (let child = el.firstChild; child; child = child.nextSibling) {
    if (child.nodeType === Node.TEXT_NODE) yield child as Text
    else yield* textNodes(child)
  }
}

/** Where each run of words of a section is in the document (`pos` of its first character) */
function runs(section: PMNode, start: number) {
  const found: { pos: number; length: number }[] = []
  section.descendants((node, pos) => {
    if (node.isText) found.push({ pos: start + 1 + pos, length: node.text?.length ?? 0 })
  })
  return found
}

/** How many characters of the section come before a document position */
function charsBefore(section: PMNode, start: number, pos: number): number {
  let count = 0
  for (const run of runs(section, start)) {
    if (pos <= run.pos) break
    count += Math.min(run.length, pos - run.pos)
  }
  return count
}

/** The document position after `chars` characters of the section */
function posAfter(section: PMNode, start: number, chars: number): number {
  let left = chars
  let last = start + 1
  for (const run of runs(section, start)) {
    if (left <= run.length) return run.pos + left
    left -= run.length
    last = run.pos + run.length
  }
  return last
}

/** How many characters of an element's words come before a DOM point inside it (a text node and an offset, or an element and a child index) */
function charsTo(el: HTMLElement, node: Node, offset: number): number {
  let target = node
  let extra = offset
  if (node.nodeType !== Node.TEXT_NODE) {
    const child = node.childNodes[offset]
    // After an element's last child: all its words count
    if (!child) return charsTo(el, node, 0) + (node.textContent?.length ?? 0)
    target = child
    extra = 0
  }
  let count = 0
  for (const text of textNodes(el)) {
    if (text === target) return count + extra
    // The first words inside the element, or after it
    if (target.contains(text) || target.compareDocumentPosition(text) & Node.DOCUMENT_POSITION_FOLLOWING) return count
    count += text.data.length
  }
  return count
}

/** The document position of a DOM point inside a section's element (`start`: the section's position in the document) */
export function posFromDom(section: PMNode, start: number, el: HTMLElement, node: Node, offset: number): number {
  return el.contains(node) ? posAfter(section, start, charsTo(el, node, offset)) : start + 1
}

/** The DOM point of a document position inside a section's element, or null when the section has no words */
export function domFromPos(section: PMNode, start: number, el: HTMLElement, pos: number): { node: Text; offset: number } | null {
  let left = charsBefore(section, start, pos)
  let last: Text | null = null
  for (const text of textNodes(el)) {
    if (left <= text.data.length) return { node: text, offset: left }
    left -= text.data.length
    last = text
  }
  return last ? { node: last, offset: last.data.length } : null
}

/** A DOM range over document positions `from`–`to` of one section's element (null: no words there) */
export function domRange(section: PMNode, start: number, el: HTMLElement, from: number, to: number): Range | null {
  const a = domFromPos(section, start, el, from)
  const b = domFromPos(section, start, el, to)
  if (!a || !b) return null
  const range = document.createRange()
  range.setStart(a.node, a.offset)
  range.setEnd(b.node, b.offset)
  return range
}
