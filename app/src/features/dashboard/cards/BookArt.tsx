import { BOOK_H, BOOK_PIXELS, BOOK_W } from './book'
import PixelRects from './PixelRects'

/** The pixel-art book of an article's card (book.ts: its pixels and colours), filling its box */
export default function BookArt({ className = '' }: { className?: string }) {
  return <PixelRects rects={BOOK_PIXELS} width={BOOK_W} height={BOOK_H} className={className} />
}
