// The article's own links (docs/plans/31): everything a link knows is written in its href, `#mapl:k=<kind>&…`, because the server's
// sanitizer keeps an <a>'s href and drops every other attribute. No record is made anywhere: the text is the only place a link lives.
// Pure (linkHref.test.ts).
import { isSafeLink } from '@map/shared/rich-text-policy'

/** The kinds of object an Article link can point to: the resources' panel types */
export const OBJECT_TYPES = ['article', 'map', 'object', 'folder', 'project'] as const
export type ObjectType = (typeof OBJECT_TYPES)[number]

/** The autolinker that made a link: its id and the text it links */
export type Rule = { id: string; text: string }

export type ArticleLink =
  | { kind: 'url'; url: string; rule?: Rule }
  | { kind: 'object'; type: ObjectType; id: string; rule?: Rule }
  | { kind: 'msg'; title: string; content: string }
  /** `to`: 'a:<anchor id>' or 'h:<heading index>:<slug>' (jumpTargets.ts) */
  | { kind: 'jump'; to: string; rule?: Rule }
  | { kind: 'anchor'; id: string }
  | { kind: 'person'; personId: string; rule?: Rule }
  /** Another person's project, by its address (Follow's URL field) */
  | { kind: 'project-url'; url: string; rule?: Rule }

export type LinkKind = ArticleLink['kind']

export const LINK_PREFIX = '#mapl:'

/** The longest values a link keeps */
export const LIMITS = { title: 100, content: 2000, url: 500, ruleText: 100 } as const

const ID = /^[\w-]{1,40}$/
const JUMP = /^(?:a:[\w-]{1,40}|h:\d{1,4}:[\w-]{0,60})$/

/** An outside address a link may open: http or https, and safe */
export const isWebUrl = (url: string) => url.length <= LIMITS.url && /^https?:\/\/[^\s]+$/i.test(url.trim()) && isSafeLink(url)

/** A short random id (anchors, autolinkers) */
export const newId = () => Math.random().toString(36).slice(2, 10).padEnd(8, '0')

/** The link as an href */
export function toHref(link: ArticleLink): string {
  const p = new URLSearchParams({ k: link.kind })
  switch (link.kind) {
    case 'url':
    case 'project-url':
      p.set('u', link.url.trim())
      break
    case 'object':
      p.set('ty', link.type)
      p.set('id', link.id)
      break
    case 'msg':
      p.set('ti', link.title.slice(0, LIMITS.title))
      p.set('c', link.content.slice(0, LIMITS.content))
      break
    case 'jump':
      p.set('to', link.to)
      break
    case 'anchor':
      p.set('id', link.id)
      break
    case 'person':
      p.set('p', link.personId)
      break
  }
  if ('rule' in link && link.rule) {
    p.set('a', link.rule.id)
    p.set('t', link.rule.text.slice(0, LIMITS.ruleText))
  }
  return LINK_PREFIX + p.toString()
}

/** The link an href holds; null when it is not one of ours, or its values are not right (unknown keys are ignored) */
export function fromHref(href: string | null | undefined): ArticleLink | null {
  if (!href?.startsWith(LINK_PREFIX)) return null
  let p: URLSearchParams
  try {
    p = new URLSearchParams(href.slice(LINK_PREFIX.length))
  } catch {
    return null
  }
  const get = (key: string) => p.get(key) ?? ''
  const ruleId = get('a')
  const ruleText = get('t')
  const rule = ID.test(ruleId) && ruleText && ruleText.length <= LIMITS.ruleText ? { rule: { id: ruleId, text: ruleText } } : {}

  switch (get('k')) {
    case 'url':
    case 'project-url': {
      const url = get('u')
      return isWebUrl(url) ? { kind: get('k') as 'url' | 'project-url', url, ...rule } : null
    }
    case 'object': {
      const type = get('ty') as ObjectType
      const id = get('id')
      return OBJECT_TYPES.includes(type) && ID.test(id) ? { kind: 'object', type, id, ...rule } : null
    }
    case 'msg': {
      const title = get('ti')
      const content = get('c')
      return title.length <= LIMITS.title && content.length <= LIMITS.content && (title || content) ? { kind: 'msg', title, content } : null
    }
    case 'jump': {
      const to = get('to')
      return JUMP.test(to) ? { kind: 'jump', to, ...rule } : null
    }
    case 'anchor': {
      const id = get('id')
      return ID.test(id) ? { kind: 'anchor', id } : null
    }
    case 'person': {
      const personId = get('p')
      return ID.test(personId) ? { kind: 'person', personId, ...rule } : null
    }
    default:
      return null
  }
}

/** The link without its autolinker */
export function withoutRule(link: ArticleLink): ArticleLink {
  if (!('rule' in link) || !link.rule) return link
  const { rule: _rule, ...rest } = link
  return rest as ArticleLink
}

/** The link made by an autolinker (a message or an anchor can't be: they stay as they are) */
export function withRule(link: ArticleLink, rule: Rule): ArticleLink {
  return link.kind === 'msg' || link.kind === 'anchor' ? link : { ...link, rule }
}

/** Whether an autolinker can make this kind of link (all but messages and anchors) */
export const AUTOLINKABLE: LinkKind[] = ['url', 'object', 'jump', 'person', 'project-url']
