// The autolinker: a text and where it links to (a rule). Every place the text is written in the article becomes that link, now and
// while it is typed. A rule is not kept anywhere but in the links it made (their href holds its id and text: linkHref.ts), so the list
// of rules is read back from the document. Pure on ProseMirror documents and transactions (autolink.test.ts).
import type { Node as PMNode } from '@tiptap/pm/model'
import type { Transaction } from '@tiptap/pm/state'
import { linkRanges } from './docLinks'
import { fromHref, toHref, withoutRule, withRule, type ArticleLink, type Rule } from './linkHref'

/** A rule as the list shows it: its text, where it links, and how many places it linked */
export type AutoRule = Rule & { link: ArticleLink; count: number }

/** One character, lower case, without its accent (one character for one, so places in the text stay right) */
function foldChar(c: string) {
  const folded = c.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
  return folded.length === 1 ? folded : c.toLowerCase().length === 1 ? c.toLowerCase() : c
}
const fold = (text: string) => Array.from(text, foldChar).join('')
const isWordChar = (c: string | undefined) => !!c && /[\p{L}\p{N}_]/u.test(c)
/** The id of the autolinker that made the link with this href, if one did */
const ruleOf = (href: string | undefined) => {
  const link = fromHref(href)
  return link && 'rule' in link ? link.rule?.id : undefined
}

/**
 * The places the text is written, as whole words (case and accents not counted), not in code and not inside another link (a link of
 * the rule `ruleId` doesn't count as another one). `[from, to]` positions in the document
 */
export function occurrences(doc: PMNode, text: string, ruleId?: string): { from: number; to: number }[] {
  const needle = fold(text.trim())
  if (!needle) return []
  const found: { from: number; to: number }[] = []
  doc.descendants((block, blockPos) => {
    if (!block.isTextblock) return true
    // The block's text, and for each character where it is and whether it can be linked
    let chars = ''
    const at: number[] = []
    const free: boolean[] = []
    block.forEach((child, offset) => {
      const start = blockPos + 1 + offset
      const linkable =
        child.isText &&
        !child.marks.some((m) => m.type.name === 'code') &&
        !child.marks.some((m) => m.type.name === 'link' && (!ruleId || ruleOf(m.attrs.href as string) !== ruleId))
      const content = child.isText ? (child.text ?? '') : '￼'
      for (let i = 0; i < content.length; i++) {
        chars += content[i]
        at.push(start + i)
        free.push(linkable)
      }
    })
    const hay = fold(chars)
    for (let i = hay.indexOf(needle); i !== -1; i = hay.indexOf(needle, i + 1)) {
      const end = i + needle.length
      if (isWordChar(chars[i - 1]) || isWordChar(chars[end])) continue
      if (!free.slice(i, end).every(Boolean)) continue
      found.push({ from: at[i], to: at[end - 1] + 1 })
    }
    return false
  })
  return found
}

/** The rules the document's links were made by, in the order they first appear */
export function rulesFrom(doc: PMNode): AutoRule[] {
  const rules = new Map<string, AutoRule>()
  for (const range of linkRanges(doc)) {
    const rule = 'rule' in range.link ? range.link.rule : undefined
    if (!rule) continue
    const known = rules.get(rule.id)
    if (known) known.count++
    else rules.set(rule.id, { ...rule, link: withoutRule(range.link), count: 1 })
  }
  return [...rules.values()]
}

/**
 * Links every free place of the rule's text (occurrences) on `tr`. `within`: only the places inside these ranges (what was just typed);
 * `skipAt`: not a place that ends here (the word the caret is still typing). Answers how many it linked
 */
export function applyRule(tr: Transaction, rule: Rule & { link: ArticleLink }, options: { within?: { from: number; to: number }[]; skipAt?: number } = {}): number {
  const type = tr.doc.type.schema.marks.link
  if (!type) return 0
  const href = toHref(withRule(rule.link, { id: rule.id, text: rule.text }))
  let count = 0
  for (const place of occurrences(tr.doc, rule.text, rule.id)) {
    if (options.within && !options.within.some((r) => place.from < r.to && place.to > r.from)) continue
    if (options.skipAt !== undefined && place.to === options.skipAt) continue
    // Already this rule's link: nothing to do
    if (tr.doc.rangeHasMark(place.from, place.to, type.create({ href }))) continue
    tr.removeMark(place.from, place.to, type)
    tr.addMark(place.from, place.to, type.create({ href }))
    count++
  }
  return count
}

/** Takes away the links of a rule (their words stay) */
export function removeRule(tr: Transaction, ruleId: string): number {
  const type = tr.doc.type.schema.marks.link
  const ranges = linkRanges(tr.doc).filter((r) => 'rule' in r.link && r.link.rule?.id === ruleId)
  for (const r of ranges) tr.removeMark(r.from, r.to, type)
  return ranges.length
}

/** The places a rule linked (for Go there) */
export function ruleRanges(doc: PMNode, ruleId: string) {
  return linkRanges(doc).filter((r) => 'rule' in r.link && r.link.rule?.id === ruleId)
}
