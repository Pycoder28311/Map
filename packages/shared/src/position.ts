// Where a row sits in its list: a fractional-indexing key (`a0`, `a1`, `a0V`…), compared byte by byte. A row moved between two
// others gets a key between theirs, so a move writes that row only and nothing is ever renumbered. The one place keys are made
// and checked, for the backend (contract, the key of a new row, cursors) and the app (list order, drops). Pure (position.test.ts).
import { BASE_62_DIGITS, generateKeyBetween, generateNKeysBetween } from 'fractional-indexing'
import { z } from 'zod'

/** The longest key accepted (keys grow by about one character per 5–6 moves into the same gap) */
export const POSITION_MAX_LENGTH = 64

// The library checks a key's head and length, not the characters after it
const DIGITS = /^[0-9A-Za-z]+$/

/** Whether a string is a key the library can place others next to */
export function isPosition(key: unknown): key is string {
  if (typeof key !== 'string' || key.length > POSITION_MAX_LENGTH || !DIGITS.test(key)) return false
  try {
    generateKeyBetween(key, null)
    return true
  } catch {
    return false
  }
}

/** The order of keys (< 0: `a` first): by UTF-16 code units, which for these ASCII keys is SQLite's BINARY order. Never localeCompare */
export const comparePositions = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0)

/** A key between two (null: no neighbour on that side), or null when there is none: `a` is not before `b` (a tie) or a key is bad */
export function positionBetween(a: string | null | undefined, b: string | null | undefined): string | null {
  try {
    return generateKeyBetween(a ?? null, b ?? null)
  } catch {
    return null
  }
}

/** `n` keys in order between two (null: open side), or null as positionBetween */
export function positionsBetween(a: string | null | undefined, b: string | null | undefined, n: number): string[] | null {
  try {
    return generateNKeysBetween(a ?? null, b ?? null, n)
  } catch {
    return null
  }
}

/** A key after `last` (none: the first key) */
export const positionAfter = (last: string | null | undefined) => generateKeyBetween(isPosition(last) ? last : null, null)
/** A key before `first` (none: the first key) */
export const positionBefore = (first: string | null | undefined) => generateKeyBetween(null, isPosition(first) ? first : null)

/**
 * The n-th key of a list numbered from the start (a0, a1, … a9, aA … az, b00 …): what generateNKeysBetween(null, null, …) gives.
 * The migration that turned positions into keys gives the same keys in SQL; its test compares the two
 */
export function integerKey(n: number): string {
  const digits = (count: number, value: number) =>
    Array.from({ length: count }, (_, i) => BASE_62_DIGITS[Math.floor(value / 62 ** (count - 1 - i)) % 62]).join('')
  if (n < 62) return `a${digits(1, n)}`
  if (n < 62 + 62 ** 2) return `b${digits(2, n - 62)}`
  return `c${digits(3, n - 62 - 62 ** 2)}`
}

/** The contract's rule for a position */
export const positionField = z.string().refine(isPosition, { message: 'Invalid position' })
