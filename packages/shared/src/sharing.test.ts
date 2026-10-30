import { describe, expect, it } from 'vitest'
import { DATA, SHAREABLE, TABLE_NAMES } from './data.config'
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
  it('defaults the lists to empty', () => {
    expect(rightsApply.parse(base)).toEqual({ ...base, set: [], remove: [] })
  })
  it('refuses a person twice, or both set and removed', () => {
    expect(rightsApply.safeParse({ ...base, set: [{ userId: 'a', role: 'reader' }, { userId: 'a', role: 'editor' }] }).success).toBe(false)
    expect(rightsApply.safeParse({ ...base, set: [{ userId: 'a', role: 'reader' }], remove: ['a'] }).success).toBe(false)
  })
  it('refuses tables that are not shareable and unknown roles', () => {
    expect(rightsApply.safeParse({ ...base, objectType: 'layouts' }).success).toBe(false)
    expect(rightsApply.safeParse({ ...base, set: [{ userId: 'a', role: 'admin' }] }).success).toBe(false)
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
