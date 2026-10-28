// Where a Jump link can go in the article: its sections (headings) and its marked places (anchors, links of kind `anchor`).
// A heading is found again by its words (`h:<index>:<slug>`; the index only tells two headings with the same words apart).
// Pure (jumpTargets.test.ts).
import type { Node as PMNode } from '@tiptap/pm/model'
import { linkRanges } from './docLinks'

type Place = { to: string; text: string; from: number; end: number }
export type JumpTarget = (Place & { kind: 'heading'; level: number; index: number; slug: string }) | (Place & { kind: 'anchor'; id: string })

/** A heading's words as a short key: "The War (1821)" → "the-war-1821" */
export function slugOf(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

/** The sections and the marked places, in the order they come in the text */
export function jumpTargets(doc: PMNode): JumpTarget[] {
  const targets: JumpTarget[] = []
  let index = 0
  doc.descendants((node, pos) => {
    if (node.type.name !== 'heading') return true
    const text = node.textContent.trim()
    const slug = slugOf(text)
    targets.push({ kind: 'heading', to: `h:${index}:${slug}`, text, slug, level: Number(node.attrs.level) || 1, index, from: pos, end: pos + node.nodeSize })
    index++
    return false
  })
  for (const r of linkRanges(doc)) {
    if (r.link.kind === 'anchor') targets.push({ kind: 'anchor', to: `a:${r.link.id}`, text: r.text, id: r.link.id, from: r.from, end: r.to })
  }
  return targets.sort((a, b) => a.from - b.from)
}

/** Where a jump goes: its target in the document, or null when it is gone */
export function resolveJump(doc: PMNode, to: string, targets = jumpTargets(doc)): JumpTarget | null {
  if (to.startsWith('a:')) return targets.find((t) => t.to === to) ?? null
  const [, indexText, slug] = /^h:(\d+):(.*)$/.exec(to) ?? []
  if (indexText === undefined) return null
  const index = Number(indexText)
  const same = targets.filter((t): t is Extract<JumpTarget, { kind: 'heading' }> => t.kind === 'heading' && t.slug === slug)
  if (same.length === 0) return null
  // The heading with these words nearest to where it was
  return same.reduce((best, t) => (Math.abs(t.index - index) < Math.abs(best.index - index) ? t : best))
}

/** The targets some jump link of the document goes to, with how many links go to each */
export function linkedTargets(doc: PMNode): { target: JumpTarget; count: number }[] {
  const targets = jumpTargets(doc)
  const counts = new Map<number, { target: JumpTarget; count: number }>()
  for (const r of linkRanges(doc)) {
    if (r.link.kind !== 'jump') continue
    const target = resolveJump(doc, r.link.to, targets)
    if (!target) continue
    const known = counts.get(target.from)
    if (known) known.count++
    else counts.set(target.from, { target, count: 1 })
  }
  return [...counts.values()].sort((a, b) => a.target.from - b.target.from)
}
