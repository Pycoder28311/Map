// The colour themes of the pixel-art elements (ParchmentScroll, ParchmentFrame, PixelBanner, PixelSign): each is a class that sets their colours
// (styles/parchment.css, .ui-theme-*). Pure.

/** `parchment`: the orange paper of the drawings (each element's own colours); `stone`: white-grey; `aged`: old tan paper, brown ink;
 * `pastel`: light pastel beige-brown; `app`: the app's own dark grey, as its fields and the sidebar's rows (styles/fields.css) */
export const PIXEL_THEMES = ['parchment', 'stone', 'aged', 'pastel', 'app'] as const
export type PixelTheme = (typeof PIXEL_THEMES)[number]

/** The class of a theme ('' for parchment: the elements' own colours) */
export const pixelThemeClass = (theme: PixelTheme = 'parchment') => (theme === 'parchment' ? '' : `ui-theme-${theme}`)
