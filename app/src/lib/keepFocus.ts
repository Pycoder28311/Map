/**
 * The `onMouseDown` of a control that must not take the focus: the text (or the field) keeps its caret and its selection while the
 * control is pressed. `<IconButton onMouseDown={keepFocus} … />`
 */
export const keepFocus = (e: { preventDefault: () => void }) => e.preventDefault()
