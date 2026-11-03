import { describe, expect, it } from 'vitest'
import { DAY_MONTH, DAY_MONTH_TIME, DAY_MONTH_YEAR, DAY_MONTH_YEAR_TIME } from './dates'

// Each format is the one its screens wrote by hand before (docs/plans/39)
const options = (f: Intl.DateTimeFormat) => {
  const { day, month, year, hour, minute } = f.resolvedOptions()
  return { day, month, year, hour, minute }
}

describe('dates', () => {
  it('has the four formats the app shows', () => {
    expect(options(DAY_MONTH_YEAR)).toEqual({ day: 'numeric', month: 'short', year: 'numeric', hour: undefined, minute: undefined })
    expect(options(DAY_MONTH)).toEqual({ day: 'numeric', month: 'short', year: undefined, hour: undefined, minute: undefined })
    expect(options(DAY_MONTH_YEAR_TIME)).toMatchObject({ day: 'numeric', month: 'short', year: 'numeric', minute: '2-digit' })
    expect(options(DAY_MONTH_TIME)).toMatchObject({ day: 'numeric', month: 'short', year: undefined, minute: '2-digit' })
  })
})
