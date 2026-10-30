// An article's autolinkers (docs/plans/35): some phrases and the link they make wherever they are written in the article. Kept in the
// article's `autolinkers` field (data.config.ts) as JSON; the article page (app/src/features/articles/links/AutolinkPanel.tsx) edits it.
// The links in the text keep the rule's id and phrase (`a`, `t`: link-href.ts), so a rule's id here is the `a` of its links.
import { z } from 'zod'
import { AUTOLINKABLE, fromHref, LIMITS } from './link-href'

/** The most autolinkers an article has, and the most phrases one has */
export const AUTOLINKERS_MAX = 50
export const AUTOLINKER_PHRASES_MAX = 20

const ID = /^[\w-]{1,40}$/

/** A phrase as it is compared: lower case, without accents (the same phrase in two autolinkers is refused) */
export const foldPhrase = (text: string) => text.trim().normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()

/** An `#mapl:` link an autolinker can make: of an autolinkable kind, and without the rule it will be given */
const link = z
  .string()
  .max(LIMITS.url + 100)
  .refine((href) => {
    const parsed = fromHref(href)
    return !!parsed && AUTOLINKABLE.includes(parsed.kind) && !('rule' in parsed && parsed.rule)
  }, 'Not a link an autolinker can make')

export const autolinker = z.object({
  id: z.string().regex(ID),
  phrases: z.array(z.string().trim().min(1).max(LIMITS.ruleText)).min(1).max(AUTOLINKER_PHRASES_MAX),
  link,
  /** The user who made it (their id; empty when it was found in the text and its maker is not known) */
  by: z.string().max(100),
})

export const autolinkers = z
  .array(autolinker)
  .max(AUTOLINKERS_MAX)
  .refine((all) => new Set(all.map((a) => a.id)).size === all.length, 'Each autolinker has its own id')
  .refine((all) => {
    const seen = new Set<string>()
    for (const a of all) {
      // (one autolinker may write a phrase twice: it counts once)
      for (const phrase of new Set(a.phrases.map(foldPhrase))) {
        if (seen.has(phrase)) return false
        seen.add(phrase)
      }
    }
    return true
  }, 'A phrase belongs to one autolinker only')

export type Autolinker = z.output<typeof autolinker>
export const EMPTY_AUTOLINKERS: Autolinker[] = []
