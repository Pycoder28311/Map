// The raised look of the Create button and the modal's own Create button (so they match): a light
// inner edge on top, a darker band along the bottom (a button's thick bottom border), a soft shadow
// under it; pressed, it sinks 2px and the band thins. Black and white at some opacity, so it suits the
// green, the gray Cancel face and dark mode alike. Full class strings so Tailwind can detect them.
// The shadows themselves are the theme's (--btn-raised-shadow, styles/tokens.css; a theme can replace them).
export const RAISED =
  '[box-shadow:var(--btn-raised-shadow)] enabled:hover:[box-shadow:var(--btn-hover-inset-dark),var(--btn-raised-shadow)] ' +
  'active:translate-y-0.5 enabled:active:[box-shadow:var(--btn-active-inset-dark),var(--btn-raised-shadow-active)]'
