// The app's date formats, defined once (in the user's locale). Each screen picks the one it shows.

const format = (options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(undefined, options)

/** "3 Nov 2026": when an item, a note or a message was made */
export const DAY_MONTH_YEAR = format({ day: 'numeric', month: 'short', year: 'numeric' })
/** "3 Nov": a dashboard card's date */
export const DAY_MONTH = format({ day: 'numeric', month: 'short' })
/** "3 Nov 2026, 14:05": a comment's date */
export const DAY_MONTH_YEAR_TIME = format({ day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })
/** "3 Nov, 14:05": a message reply's date */
export const DAY_MONTH_TIME = format({ day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
