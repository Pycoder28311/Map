import type { Infobox } from '@map/shared'
import characterBanner from '../../assets/starters/character-banner.jpg'
import characterInfo from '../../assets/starters/character-info.jpg'
import worldBanner from '../../assets/starters/world-banner.jpg'
import worldInfo from '../../assets/starters/world-info.jpg'

/**
 * The three cards a new user finds in the Dashboard's Orphans row: a map and two articles (docs: instructions/starters.md). They are
 * not in the database: each is made there the first time it is edited (makeStarter.ts), and until then it is only a card and a page
 * shown from what is here. The pictures are public-domain paintings (Wikimedia Commons), stored with the app; they are uploaded as
 * the user's own pictures when the article is made, since an article keeps only pictures the app stored.
 */

export type StarterKey = 'character' | 'world' | 'map'

/** The id of a starter's panel and card: never a number, so it is never taken for an item's id */
export const starterId = (key: StarterKey) => `starter-${key}`

export const isStarterId = (id: string | number | undefined): boolean => typeof id === 'string' && id.startsWith('starter-')

export const starterKeyOf = (id: string): StarterKey | undefined => STARTERS.find((s) => starterId(s.key) === id)?.key

type StarterArticle = {
  key: 'character' | 'world'
  resource: 'articles'
  title: string
  /** The article's text: a short description */
  content: string
  /** Its Info box (the picture addresses are the app's own files until it is made) */
  infobox: Infobox
}
type StarterMap = { key: 'map'; resource: 'maps'; title: string }
export type Starter = StarterArticle | StarterMap

const row = (id: string, label: string, value: string) => ({ id, label, kind: 'value' as const, value })
const list = (id: string, label: string, items: string[]) => ({ id, label, kind: 'list' as const, items, ordered: false })

/** In the order of the row */
export const STARTERS: Starter[] = [
  { key: 'map', resource: 'maps', title: 'My world map' },
  {
    key: 'character',
    resource: 'articles',
    title: 'My main character',
    content:
      '<p>This is your main character: the one the story follows. Write who they are, where they come from and what they want most. Change the picture, the name and the facts in the Info box to make them yours.</p>',
    infobox: {
      image: characterInfo,
      banner: characterBanner,
      name: 'My main character',
      rows: [row('role', 'Role', 'Hero'), row('home', 'Home', 'A village by the sea'), row('age', 'Age', '24'), list('traits', 'Traits', ['Brave', 'Curious', 'Stubborn'])],
    },
  },
  {
    key: 'world',
    resource: 'articles',
    title: 'My fantasy world',
    content:
      '<p>This is the world your stories happen in. Describe its lands, its peoples and its history, and what makes it different from ours. Change the picture, the name and the facts in the Info box to make it yours.</p>',
    infobox: {
      image: worldInfo,
      banner: worldBanner,
      name: 'My fantasy world',
      rows: [row('kind', 'Kind', 'High fantasy'), row('capital', 'Capital', 'The old city'), row('magic', 'Magic', 'Rare and ancient'), list('peoples', 'Peoples', ['Humans', 'Elves', 'Dwarves'])],
    },
  },
]

export const starterOf = (key: StarterKey): Starter => STARTERS.find((s) => s.key === key)!

/** A starter as an item, for its card and its page: the fields of an article or a map, with nothing on the server */
export function starterItem(starter: Starter): Record<string, unknown> & { id: string; title: string; archived: boolean; createdAt: string; updatedAt: string } {
  const now = new Date().toISOString()
  const base = { id: starterId(starter.key), title: starter.title, archived: false, pinned: false, createdAt: now, updatedAt: now, objectType: null, objectId: null, access: 'owner' }
  if (starter.resource === 'maps') return { ...base, branchOf: 0, position: 'a0' }
  return { ...base, content: starter.content, preview: starter.content.replace(/<[^>]+>/g, ''), infobox: starter.infobox, autolinkers: [], visibility: 'private' }
}
