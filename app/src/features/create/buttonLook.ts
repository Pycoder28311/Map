// The raised look of the Create button and the modal's own Create button (so they match): a light
// inner edge on top, a darker band along the bottom (a button's thick bottom border), a soft shadow
// under it; pressed, it sinks 2px and the band thins. Black and white at some opacity, so it suits the
// green, the gray Cancel face and dark mode alike. Full class strings so Tailwind can detect them.
export const RAISED =
  'shadow-[inset_0_2px_0_rgb(255_255_255/0.3),inset_0_-4px_0_rgb(0_0_0/0.24),0_6px_16px_rgb(0_0_0/0.22)] ' +
  'active:translate-y-0.5 active:shadow-[inset_0_2px_0_rgb(255_255_255/0.3),inset_0_-2px_0_rgb(0_0_0/0.24),0_3px_8px_rgb(0_0_0/0.2)]'
