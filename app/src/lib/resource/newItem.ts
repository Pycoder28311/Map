// A new item that is not on the server yet: its panel is `{ type, id: NEW_ID }`. The page is made by the sidebar's "+" and makes the item
// when something is typed (components/ui/resource/NewItemEditor.tsx); the page then shows the item under its real id.

/** The id of the panel of an item that does not exist yet */
export const NEW_ID = 'new'

export const isNewId = (id: string | undefined) => id === NEW_ID

/** Where the cursor was when the item was made: the page that shows it next puts it back (the field's name; kept until used) */
const focus = new Map<string, string>()

export const keepFocus = (name: string, id: number | string, field: string) => void focus.set(`${name}/${id}`, field)

/** The field the cursor was in (read while rendering, so reading it leaves it: `dropFocus` clears it once the page has shown) */
export const peekFocus = (name: string, id: string) => focus.get(`${name}/${id}`)

export const dropFocus = (name: string, id: string) => void focus.delete(`${name}/${id}`)
