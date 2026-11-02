// The app does not know where the server keeps its images (the backend sets that for its own checks), so a file read here
// would lose every picture of an Info box. The addresses the app itself got from an upload look like `<folder>/<uuid>.<jpg|png|webp>`:
// those are kept, and anything else is still dropped. Pure (storedImages.test.ts).
import { setRichTextImageBase } from '@map/shared'

const IMAGE_ADDRESS = /^https?:\/\/[^\s"?#]+\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(?:jpg|png|webp)$/
const ADDRESSES = /https?:\/\/[^\s"?#\\]+\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(?:jpg|png|webp)/g

/** Whether the text is the address of a picture the app stored */
export const isStoredImage = (src: string | undefined | null): src is string => !!src && IMAGE_ADDRESS.test(src)

/** Runs `read` with the shared checks accepting the pictures that look stored in `text` (their folder), then as they were */
export function withStoredImages<T>(text: string, read: () => T): T {
  const folders = new Set((text.match(ADDRESSES) ?? []).map((url) => url.slice(0, url.lastIndexOf('/') + 1)))
  // One folder is where a server keeps its images; a second one is somebody else's address: those are dropped
  const [folder] = folders.size === 1 ? folders : []
  setRichTextImageBase(folder ?? null)
  try {
    return read()
  } finally {
    setRichTextImageBase(null)
  }
}
