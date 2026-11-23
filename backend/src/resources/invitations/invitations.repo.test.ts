import { DATA, invitationInput, invitationsFilter, type InvitationInput } from '@map/shared'
import { describe, expect, it } from 'vitest'
import * as schema from '../../db/schema'
import type { Ctx } from '../../lib/crud'
import { HttpError } from '../../lib/errors'
import { ownedRepo } from '../../lib/ownedRepo'
import { newUser as baseUser, give } from '../../lib/ownedRepo.suite'
import { listShared } from '../shared/shared.repo'
import { collaboratorsOf } from '../rights/rights.repo'
import { followCounts, followsRepo } from '../follows/follows.repo'
import { invitationsRepo, pendingCount } from './invitations.repo'

/** A user whose SOCIAL_WRITES limiter lets `allowed` writes through (as the binding does, per person) */
function newUser(name?: string, allowed = 1000): Ctx {
  const ctx = baseUser(name)
  let left = allowed
  return { ...ctx, env: { SOCIAL_WRITES: { limit: async () => ({ success: left-- > 0 }) } } as unknown as CloudflareBindings }
}

const articles = ownedRepo(schema.articles, DATA.articles)
const notes = ownedRepo(schema.notes, DATA.notes)
const newArticle = async (owner: Ctx, title = 'The Drowned Kingdom') => (await articles.create(owner, DATA.articles.input.parse({ title }) as never)).id as number
const follow = (who: Ctx, whom: Ctx) => followsRepo.create(who, { userId: whom.user!.id })
const invite = (from: Ctx, to: Ctx, objectId: number, role: 'reader' | 'editor' = 'editor', objectType = 'articles') =>
  invitationsRepo.create(from, invitationInput.parse({ type: 'collaboration', recipientId: to.user!.id, objectType, objectId, payload: { role } }) as InvitationInput)
const inbox = (ctx: Ctx, extra: Record<string, string> = {}) => invitationsRepo.list(ctx, { limit: 20, cursor: null }, invitationsFilter.parse({ box: 'inbox', ...extra }))
const sent = (ctx: Ctx, extra: Record<string, string> = {}) => invitationsRepo.list(ctx, { limit: 20, cursor: null }, invitationsFilter.parse({ box: 'sent', ...extra }))

async function status(promise: Promise<unknown>): Promise<number | string> {
  try {
    await promise
  } catch (error) {
    if (error instanceof HttpError) return error.code === 'VALIDATION_FAILED' || error.code === 'NOT_FOUND' || error.code === 'FORBIDDEN' ? error.status : error.code
    throw error
  }
  return 200
}

describe('follows', () => {
  it('follows once, lists both ways newest first with whether it goes back, and counts', async () => {
    const me = newUser('Me')
    const ann = newUser('Ann')
    const bob = newUser('Bob')
    await follow(me, ann)
    await follow(me, ann) // nothing changes
    await follow(me, bob)
    await follow(ann, me)
    const following = await followsRepo.list(me, { limit: 20, cursor: null }, { direction: 'following' })
    expect(following.items.map((i) => [i.user.name, i.mutual])).toEqual([
      ['Bob', false],
      ['Ann', true],
    ])
    const followers = await followsRepo.list(me, { limit: 20, cursor: null }, { direction: 'followers' })
    expect(followers.items.map((i) => [i.user.name, i.mutual])).toEqual([['Ann', true]])
    expect(await followCounts(me, undefined)).toEqual({ followers: 1, following: 2 })
  })

  it('pages through a list', async () => {
    const me = newUser()
    for (let i = 0; i < 3; i++) await follow(me, newUser())
    const first = await followsRepo.list(me, { limit: 2, cursor: null }, { direction: 'following' })
    expect(first.items).toHaveLength(2)
    const rest = await followsRepo.list(me, { limit: 2, cursor: first.nextCursor }, { direction: 'following' })
    expect(rest.items).toHaveLength(1)
    expect(rest.nextCursor).toBeNull()
  })

  it('never oneself, nobody unknown; rate-limited', async () => {
    const me = newUser(undefined, 1)
    expect(await status(followsRepo.create(me, { userId: me.user!.id }))).toBe(400)
    expect(await status(followsRepo.create(me, { userId: 'nobody' }))).toBe('UNKNOWN_REFERENCE')
    expect(await status(follow(me, newUser()))).toBe('TOO_MANY_REQUESTS')
  })

  it('someone else\'s lists: only for the people they collaborate with', async () => {
    const owner = newUser()
    const ann = newUser()
    const stranger = newUser()
    await follow(owner, ann)
    const asked = { direction: 'following' as const, userId: owner.user!.id }
    expect(await status(followsRepo.list(stranger, { limit: 20, cursor: null }, asked))).toBe(404)
    expect(await status(followCounts(stranger, owner.user!.id))).toBe(404)
    const article = await newArticle(owner)
    await give(owner, 'articles', article, stranger, 'reader')
    expect((await followsRepo.list(stranger, { limit: 20, cursor: null }, asked)).items).toHaveLength(1)
    // Both ways: the owner may read the collaborator's
    expect(await followCounts(owner, stranger.user!.id)).toEqual({ followers: 0, following: 0 })
  })

  it('unfollow, or remove a follower; a third person cannot', async () => {
    const me = newUser()
    const ann = newUser()
    const made = await follow(me, ann)
    expect(await followsRepo.get(ann, made.id)).toMatchObject({ followerId: me.user!.id })
    expect(await followsRepo.remove(newUser(), made.id)).toBe(false)
    expect(await followsRepo.remove(ann, made.id)).toBe(true) // removing a follower
    const again = await follow(me, ann)
    expect(await followsRepo.remove(me, again.id)).toBe(true)
    expect(await followCounts(me, undefined)).toEqual({ followers: 0, following: 0 })
  })
})

describe('invitations: collaboration', () => {
  it('invite someone I follow; they see it, accept, and become a collaborator with its role', async () => {
    const owner = newUser('Olga')
    const ann = newUser('Ann')
    const article = await newArticle(owner)
    await follow(owner, ann)
    const made = await invite(owner, ann, article, 'editor')
    expect(made).toMatchObject({
      type: 'collaboration',
      status: 'pending',
      from: { name: 'Olga' },
      to: { name: 'Ann' },
      object: { type: 'articles', id: article, title: 'The Drowned Kingdom' },
      payload: { role: 'editor' },
    })
    expect(await pendingCount(ann)).toEqual({ count: 1 })
    expect((await inbox(ann)).items.map((i) => i.id)).toEqual([made.id])
    expect((await sent(owner, { objectType: 'articles', objectId: String(article), status: 'pending' })).items).toHaveLength(1)

    const accepted = await invitationsRepo.update(ann, made.id, { status: 'accepted' })
    expect(accepted).toMatchObject({ status: 'accepted', answeredAt: expect.any(String) })
    expect(await pendingCount(ann)).toEqual({ count: 0 })
    expect(await articles.get(ann, article)).toMatchObject({ access: 'editor' })
    expect((await collaboratorsOf(ann, 'articles', article)).map((c) => [c.user.name, c.role])).toEqual([
      ['Olga', 'owner'],
      ['Ann', 'editor'],
    ])
    // The articles Ann is on
    expect((await listShared(ann, { limit: 10, cursor: null }, { objectType: 'articles' })).items.map((i) => i.title)).toEqual(['The Drowned Kingdom'])
    // Answered once: a second Accept writes nothing
    expect(await invitationsRepo.update(ann, made.id, { status: 'accepted' })).toBeNull()
  })

  it('decline: nothing given; a new invitation can come after', async () => {
    const owner = newUser()
    const ann = newUser()
    const article = await newArticle(owner)
    await follow(owner, ann)
    const made = await invite(owner, ann, article, 'reader')
    expect(await invitationsRepo.update(ann, made.id, { status: 'declined' })).toMatchObject({ status: 'declined' })
    expect(await articles.get(ann, article)).toBeNull()
    expect(await invite(owner, ann, article, 'reader')).toMatchObject({ status: 'pending' })
  })

  it('refuses: someone I don\'t follow, myself, twice while pending, a collaborator, someone else\'s item, a note', async () => {
    const owner = newUser()
    const ann = newUser()
    const bob = newUser()
    const article = await newArticle(owner)
    expect(await status(invite(owner, ann, article))).toBe('NOT_FOLLOWING')
    await follow(owner, ann)
    await follow(owner, bob)
    expect(await status(invitationsRepo.create(owner, { type: 'collaboration', recipientId: owner.user!.id, objectType: 'articles', objectId: article, payload: { role: 'reader' } }))).toBe(400)
    await invite(owner, ann, article)
    expect(await status(invite(owner, ann, article))).toBe('ALREADY_INVITED')
    await give(owner, 'articles', article, bob, 'reader')
    expect(await status(invite(owner, bob, article))).toBe('ALREADY_COLLABORATOR')
    await follow(ann, bob)
    expect(await status(invite(ann, bob, article))).toBe(404)
    const note = (await notes.create(owner, DATA.notes.input.parse({ title: 'n' }) as never)).id as number
    expect(() => invitationInput.parse({ type: 'collaboration', recipientId: ann.user!.id, objectType: 'notes', objectId: note, payload: { role: 'reader' } })).toThrow()
  })

  it('maps, folders and projects take invitations too', async () => {
    const owner = newUser()
    const ann = newUser()
    await follow(owner, ann)
    const maps = ownedRepo(schema.maps, DATA.maps)
    const map = (await maps.create(owner, DATA.maps.input.parse({ title: 'Shattered Coast' }) as never)).id as number
    const made = await invite(owner, ann, map, 'reader', 'maps')
    await invitationsRepo.update(ann, made.id, { status: 'accepted' })
    expect(await maps.get(ann, map)).toMatchObject({ access: 'reader', title: 'Shattered Coast' })
  })

  it('unsend: only the sender, only while pending', async () => {
    const owner = newUser()
    const ann = newUser()
    const article = await newArticle(owner)
    await follow(owner, ann)
    const made = await invite(owner, ann, article)
    expect(await invitationsRepo.remove(ann, made.id)).toBe(false)
    expect(await invitationsRepo.remove(owner, made.id)).toBe(true)
    expect((await inbox(ann)).items).toEqual([])
    const again = await invite(owner, ann, article)
    await invitationsRepo.update(ann, again.id, { status: 'declined' })
    expect(await invitationsRepo.remove(owner, again.id)).toBe(false)
  })

  it('unfollowing cancels the pending invitations I sent them (U7)', async () => {
    const owner = newUser()
    const ann = newUser()
    const article = await newArticle(owner)
    const followed = await follow(owner, ann)
    await invite(owner, ann, article)
    await followsRepo.remove(owner, followed.id)
    expect((await inbox(ann)).items).toEqual([])
  })

  it('accepting when the item is in the Trash or gone: 410, nothing given, the invitation removed (U8)', async () => {
    const owner = newUser()
    const ann = newUser()
    const article = await newArticle(owner)
    await follow(owner, ann)
    const made = await invite(owner, ann, article)
    await articles.update(owner, article, DATA.articles.update.parse({ archived: true }) as never)
    expect(await status(invitationsRepo.update(ann, made.id, { status: 'accepted' }))).toBe('NOT_AVAILABLE')
    expect(await invitationsRepo.get(ann, made.id)).toBeNull()
    await articles.update(owner, article, DATA.articles.update.parse({ archived: false }) as never)
    expect(await articles.get(ann, article)).toBeNull()
    // Deleted for good: its invitations go with it (the trigger)
    await invite(owner, ann, article)
    await articles.remove(owner, article)
    expect((await inbox(ann)).items).toEqual([])
  })

  it('only the two people see an invitation; only the recipient answers', async () => {
    const owner = newUser()
    const ann = newUser()
    const article = await newArticle(owner)
    await follow(owner, ann)
    const made = await invite(owner, ann, article)
    expect(await invitationsRepo.get(newUser(), made.id)).toBeNull()
    expect(await invitationsRepo.update(owner, made.id, { status: 'accepted' })).toBeNull()
    expect(await invitationsRepo.get(owner, made.id)).toMatchObject({ status: 'pending' })
  })
})
