// Reading the article's links out of its document (a ProseMirror doc): each link once, from where it starts to where it ends.
// Pure (autolink.test.ts, jumpTargets.test.ts).
import type { Node as PMNode } from '@tiptap/pm/model'
import { fromHref, type ArticleLink } from './linkHref'

export type LinkRange = { from: number; to: number; href: string; link: ArticleLink; text: string }

/** Every one of our links (#mapl:) in the document, in order; text nodes next to each other with the same href are one link */
export function linkRanges(doc: PMNode): LinkRange[] {
  const ranges: LinkRange[] = []
  doc.descendants((node, pos) => {
    if (!node.isText) return
    const mark = node.marks.find((m) => m.type.name === 'link')
    const href = mark?.attrs.href as string | undefined
    const link = fromHref(href)
    if (!href || !link) return
    const last = ranges.at(-1)
    if (last && last.to === pos && last.href === href) {
      last.to = pos + node.nodeSize
      last.text += node.text ?? ''
    } else ranges.push({ from: pos, to: pos + node.nodeSize, href, link, text: node.text ?? '' })
  })
  return ranges
}

/** The link at a position (the caret), if one of ours is there */
export function linkAt(doc: PMNode, pos: number): LinkRange | null {
  return linkRanges(doc).find((r) => r.from <= pos && pos <= r.to) ?? null
}
