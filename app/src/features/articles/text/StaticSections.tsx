import { DOMSerializer, type Node as PMNode } from '@tiptap/pm/model'
import { memo, useLayoutEffect, useRef } from 'react'

/** Each section's HTML, drawn once (a document's nodes never change: a changed section is a new node) */
const drawn = new WeakMap<PMNode, HTMLElement>()

function elementOf(node: PMNode): HTMLElement {
  let el = drawn.get(node)
  if (!el) {
    el = DOMSerializer.fromSchema(node.type.schema).serializeNode(node) as HTMLElement
    drawn.set(node, el)
  }
  return el
}

/**
 * Sections `from` to `to` (not included) of a document, as plain HTML without an editor (the article's text before it is clicked, and
 * around the editor's window). Each top element says which section it is (`data-section`, only on the page: what is saved is the document).
 * An element whose section is unchanged is kept as it is; the others are drawn from the section's own HTML
 */
function StaticSections({ doc, from, to }: { doc: PMNode; from: number; to: number }) {
  const box = useRef<HTMLDivElement>(null)
  // The elements shown now, by their section's node
  const shown = useRef(new Map<PMNode, HTMLElement[]>())

  useLayoutEffect(() => {
    const el = box.current
    if (!el) return
    const old = shown.current
    const next = new Map<PMNode, HTMLElement[]>()
    const children: HTMLElement[] = []
    for (let i = from; i < Math.min(to, doc.childCount); i++) {
      const node = doc.child(i)
      const child = old.get(node)?.pop() ?? (elementOf(node).cloneNode(true) as HTMLElement)
      child.dataset.section = String(i)
      children.push(child)
      next.set(node, [...(next.get(node) ?? []), child])
    }
    shown.current = next
    el.replaceChildren(...children)
  }, [doc, from, to])

  return <div ref={box} data-static="" className="article-static" />
}

export default memo(StaticSections)
