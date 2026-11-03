import { SITE_URL } from '../config'
import { isDesktop } from './platform'

/**
 * Absolute URL of a page of the website, for links that come back from emails or Google.
 * Website: this page's own origin. Desktop: the live website, because email links open in the
 * system browser, which can't open tauri://localhost.
 */
export const appUrl = (path: string) => `${isDesktop ? SITE_URL : window.location.origin}${path}`

/** "https://" in front of an address typed without a scheme */
export const withScheme = (url: string) => (/^[a-z][a-z0-9+.-]*:/i.test(url.trim()) ? url.trim() : `https://${url.trim()}`)

/** Opens an outside address in a new tab, which cannot reach back to this page */
export const openInNewTab = (url: string) => void window.open(url, '_blank', 'noopener,noreferrer')
