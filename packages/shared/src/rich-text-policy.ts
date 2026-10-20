// The rules for rich text (HTML written in the editor), in one place: the server's sanitizer and the editor both read them.
// No imports on purpose, so the app can load this file alone (@map/shared/rich-text-policy).

/** The longest text accepted (characters of HTML): longer is rejected, not cut */
export const RICH_TEXT_MAX = 100_000

/** The only link schemes; a relative link (no scheme) is fine too */
export const LINK_SCHEMES = ['http:', 'https:', 'mailto:'] as const

/** Whether a link target may be kept: one of LINK_SCHEMES, or relative (but not "//host", which leaves the domain unnoticed) */
export function isSafeLink(raw: string | undefined | null): boolean {
  // Browsers ignore tabs, new lines and control characters inside a scheme ("java\tscript:")
  const href = (raw ?? '').replace(/[\u0000- \u007f-\u009f]/g, '')
  if (!href) return false
  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(href)
  if (scheme) return (LINK_SCHEMES as readonly string[]).includes(`${scheme[1].toLowerCase()}:`)
  return !href.startsWith('//')
}

// Images in the text: only ones the app itself stores (backend/src/resources/images). Where they live comes from the
// server's settings, so the backend sets it once per request (setRichTextImageBase) before any text is validated.
// Not set: no image is kept.
let imageBase: string | null = null

/** The start of every stored image's address, e.g. "https://images.example.com/map/img/"; null: no images are allowed */
export function setRichTextImageBase(base: string | null) {
  imageBase = base
}

/** An address of a stored image: the base, a uuid and jpg, png or webp (no query, no hash) */
const IMAGE_FILE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(?:jpg|png|webp)$/

/** Whether an image address may stay in the text */
export const isSafeImageSrc = (src: string | undefined | null): boolean =>
  imageBase !== null && !!src && src.startsWith(imageBase) && IMAGE_FILE.test(src.slice(imageBase.length))
