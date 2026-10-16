// Which look the app has. A theme is a file in styles/themes/ that overrides the base values (styles/colors.css,
// tokens.css) under :root[data-theme='<name>']; 'base' has no file: it is the values of those two files themselves.

export const THEMES = ['base', 'arcane', 'pixel'] as const
export type Theme = (typeof THEMES)[number]

/** The theme used until one is picked: change this one word to switch the whole app */
export const DEFAULT_THEME: Theme = 'arcane'

const KEY = 'theme'

function isTheme(value: unknown): value is Theme {
  return THEMES.includes(value as Theme)
}

/** The picked theme (kept in this browser), else the default */
export function currentTheme(): Theme {
  try {
    const stored = localStorage.getItem(KEY)
    if (isTheme(stored)) return stored
  } catch {
    // storage blocked: use the default
  }
  return DEFAULT_THEME
}

/** Switches the look now; kept for the next visit. From the browser console: setTheme('base') */
export function setTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme
  try {
    localStorage.setItem(KEY, theme)
  } catch {
    // storage blocked: the theme lasts until the page is reloaded
  }
}

/** Called once at start, before the first render */
export function applyTheme() {
  document.documentElement.dataset.theme = currentTheme()
  // so the console command works: window.setTheme('base')
  Object.assign(window, { setTheme })
}
