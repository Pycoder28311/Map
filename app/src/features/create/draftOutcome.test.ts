import { describe, expect, it } from 'vitest'
import { draftOutcome } from './draftOutcome'

const modal = { askOnTitleOnly: true }
const card = { askOnTitleOnly: false }

describe('draftOutcome', () => {
  it('discards a draft with nothing typed (a blank title counts as nothing)', () => {
    expect(draftOutcome('', '', modal)).toBe('discard')
    expect(draftOutcome('   ', '', modal)).toBe('discard')
    expect(draftOutcome('', '', card)).toBe('discard')
  })

  it('asks for a modal draft with only a title', () => {
    expect(draftOutcome('Plan', '', modal)).toBe('ask')
  })

  it('creates a modal draft with text, with or without a title', () => {
    expect(draftOutcome('', '<p>hello</p>', modal)).toBe('create')
    expect(draftOutcome('Plan', '<p>hello</p>', modal)).toBe('create')
  })

  it('never asks on a card: a title creates it', () => {
    expect(draftOutcome('Characters', '', card)).toBe('create')
  })
})
