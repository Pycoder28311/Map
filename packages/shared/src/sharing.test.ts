import { describe, expect, it } from 'vitest'
import { DATA, INVITABLE, SHAREABLE, TABLE_NAMES } from './data.config'
import { followsFilter } from './follows'
import { invitationInput, invitationsFilter } from './invitations'
import { messageFilter, messageImport, messageInput, messageUpdate } from './messages'
import { rightsApply } from './rights'

describe('shared tables', () => {
  it('SHAREABLE lists exactly the tables with share: true', () => {
    expect([...SHAREABLE]).toEqual(TABLE_NAMES.filter((name) => (DATA[name] as { share?: true }).share))
  })
  it('an update of a shared table takes baseVersion; its input and other tables do not', () => {
    expect(DATA.notes.update.parse({ title: 'x', baseVersion: 3 })).toEqual({ title: 'x', baseVersion: 3 })
    expect(DATA.notes.update.safeParse({ baseVersion: -1 }).success).toBe(false)
    expect(DATA.notes.input.parse({ title: 'x', baseVersion: 3 })).toEqual({ title: 'x' })
    expect(DATA.layouts.update.parse({ baseVersion: 3 })).toEqual({})
  })
  it('never takes visibility, version or editedBy from a client', () => {
    expect(DATA.articles.update.parse({ visibility: 'public', version: 9, editedBy: 'x' })).toEqual({})
  })
})

describe('rightsApply', () => {
  const base = { objectType: 'notes', objectId: 1 }
  it('defaults the list to empty', () => {
    expect(rightsApply.parse(base)).toEqual({ ...base, remove: [] })
  })
  it('adds nobody: people come only by an accepted invitation', () => {
    expect(rightsApply.parse({ ...base, set: [{ userId: 'a', role: 'reader' }] })).toEqual({ ...base, remove: [] })
  })
  it('refuses tables that are not shareable', () => {
    expect(rightsApply.safeParse({ ...base, objectType: 'layouts' }).success).toBe(false)
  })
})

describe('invitations', () => {
  const base = { type: 'collaboration', recipientId: 'u2', objectType: 'articles', objectId: 3, payload: { role: 'editor' } }
  it('INVITABLE is shareable, with maps and without notes', () => {
    for (const name of INVITABLE) expect(SHAREABLE).toContain(name)
    expect(INVITABLE).toContain('maps')
    expect(INVITABLE).not.toContain('notes')
  })
  it('takes a collaboration with a role', () => {
    expect(invitationInput.parse(base)).toEqual(base)
    expect(invitationInput.safeParse({ ...base, payload: { role: 'admin' } }).success).toBe(false)
    expect(invitationInput.safeParse({ ...base, type: 'party' }).success).toBe(false)
  })
  it('refuses notes and tables that are not shareable', () => {
    expect(invitationInput.safeParse({ ...base, objectType: 'notes' }).success).toBe(false)
    expect(invitationInput.safeParse({ ...base, objectType: 'layouts' }).success).toBe(false)
  })
  it('a filter names a box; an item needs its type', () => {
    expect(invitationsFilter.parse({ box: 'inbox' })).toEqual({ box: 'inbox' })
    expect(invitationsFilter.parse({ box: 'sent', objectType: 'maps', objectId: '4', status: 'pending' })).toEqual({ box: 'sent', objectType: 'maps', objectId: 4, status: 'pending' })
    expect(invitationsFilter.safeParse({ box: 'sent', objectId: '4' }).success).toBe(false)
    expect(invitationsFilter.safeParse({ box: 'outbox' }).success).toBe(false)
  })
})

describe('follows', () => {
  it('a list names its direction', () => {
    expect(followsFilter.parse({ direction: 'followers' })).toEqual({ direction: 'followers' })
    expect(followsFilter.safeParse({ direction: 'friends' }).success).toBe(false)
  })
})

describe('messages', () => {
  it('needs a title or a text', () => {
    expect(messageInput.safeParse({ articleId: 1 }).success).toBe(false)
    expect(messageInput.safeParse({ articleId: 1, title: '   ' }).success).toBe(false)
    expect(messageInput.parse({ articleId: 1, content: 'hi' })).toEqual({ articleId: 1, title: '', content: 'hi' })
  })
  it('limits the title and the text', () => {
    expect(messageInput.safeParse({ articleId: 1, title: 'x'.repeat(101) }).success).toBe(false)
    expect(messageInput.safeParse({ articleId: 1, content: 'x'.repeat(2001) }).success).toBe(false)
  })
  it('an update cannot empty both', () => {
    expect(messageUpdate.safeParse({ title: '', content: '' }).success).toBe(false)
    expect(messageUpdate.parse({ title: '' })).toEqual({ title: '' })
    expect(messageUpdate.parse({ done: true })).toEqual({ done: true })
  })
  it('reads the excluded ids of a filter', () => {
    expect(messageFilter.parse({ articleId: '4', exclude: '3,1,3' })).toEqual({ articleId: 4, exclude: [3, 1] })
    expect(messageFilter.parse({ articleId: '4' })).toEqual({ articleId: 4, exclude: [] })
    expect(messageFilter.safeParse({ articleId: '4', exclude: '1,x' }).success).toBe(false)
  })
  it('imports between 1 and 50 old messages', () => {
    expect(messageImport.safeParse({ articleId: 1, items: [] }).success).toBe(false)
    expect(messageImport.parse({ articleId: 1, items: [{ title: 't' }] })).toEqual({ articleId: 1, items: [{ title: 't', content: '' }] })
  })
})
