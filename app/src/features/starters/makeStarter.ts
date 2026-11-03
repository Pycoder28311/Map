import type { Infobox } from '@map/shared'
import { uploadImage } from '../../lib/api/images'
import type { FormValues } from '../../lib/resource/changed'
import { actionsOf } from '../../lib/resource/hooks'
import type { ListStore } from '../../lib/resource/listStore'
import { resourceByName } from '../../resources/registry'
import { articlePatch } from '../articles/page/articleValues'
import { copyBoard, dropBoard, loadBoard, saveBoard } from '../board/boardStore'
import { starterId, type StarterKey } from './starterItems'
import { dropStarter } from './startersStore'

/** A starter being made: a second change while the first is on its way waits for the same item */
const making = new Map<StarterKey, Promise<string>>()

/** One of the app's own pictures, stored as the user's (the address an article may keep); any other address is left as it is */
async function storeOwn(src: string | null | undefined, own: string[]): Promise<string | null> {
  if (!src || !own.includes(src)) return src ?? null
  const blob = await (await fetch(src)).blob()
  const name = src.split('/').pop()?.split('?')[0] || 'picture.jpg'
  return uploadImage(new File([blob], name, { type: blob.type || 'image/jpeg' }))
}

/**
 * Makes a starter article from its page's values (the starter's, with the first change in them): its pictures stored first, then the
 * article; the lists take it in. Resolves with its id. `own`: the app's picture addresses the starter came with
 */
export function makeStarterArticle(key: StarterKey, values: FormValues, own: string[], userId: string, store: ListStore): Promise<string> {
  const known = making.get(key)
  if (known) return known
  const run = (async () => {
    const resource = resourceByName('articles')!
    const patch = articlePatch(values)
    const infobox = patch.infobox as Infobox | undefined
    if (infobox) {
      const [image, banner] = await Promise.all([storeOwn(infobox.image, own), storeOwn(infobox.banner, own)])
      patch.infobox = { ...infobox, image, banner }
    }
    const made = await actionsOf(resource).create(patch)
    store.seedItem(resource, made)
    dropStarter(userId, key)
    return String((made as { id: number | string }).id)
  })()
  making.set(key, run)
  // A failure can be tried again by the next change
  run.catch(() => making.delete(key))
  return run
}

/** Makes the starter map: the map, then its board (what is drawn on the starter's) saved as its file. Resolves with its id */
export function makeStarterMap(title: string, userId: string, store: ListStore): Promise<string> {
  const known = making.get('map')
  if (known) return known
  const run = (async () => {
    const resource = resourceByName('maps')!
    const made = await actionsOf(resource).create({ title })
    store.seedItem(resource, made)
    const id = String((made as { id: number | string }).id)
    // Its (empty) file first, so the board is saved over the version the server has
    await loadBoard(id)
    copyBoard(starterId('map'), id)
    await saveBoard(id)
    dropBoard(starterId('map'))
    dropStarter(userId, 'map')
    return id
  })()
  making.set('map', run)
  run.catch(() => making.delete('map'))
  return run
}
