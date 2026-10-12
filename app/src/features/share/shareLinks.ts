// Sharing an object: its app link (the same page it opens on) and the share URLs of social sites.
// Pure (shareLinks.test.ts). People who open the link must sign in, and see it only if it's theirs.
import { single } from '../workspace/layout'
import type { PanelRegistry } from '../workspace/types'
import { hrefFor } from '../workspace/useWorkspace'

/** The object's link, absolute (e.g. https://…/workspace?panels=note:n1) */
export function shareUrl(panel: { type: string; id: string }, registry: PanelRegistry, origin: string) {
  return new URL(hrefFor(single(panel), registry), origin).toString()
}

export type SocialSite = 'x' | 'facebook' | 'linkedin' | 'whatsapp' | 'email'

/** Each site's "share this link" URL */
export function socialLinks(url: string, title: string): Record<SocialSite, string> {
  const u = encodeURIComponent(url)
  const t = encodeURIComponent(title)
  return {
    x: `https://x.com/intent/post?url=${u}&text=${t}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${u}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${u}`,
    whatsapp: `https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}`,
    email: `mailto:?subject=${t}&body=${u}`,
  }
}
