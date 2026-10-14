import { decodeBoard, encodeBoard } from '../board/boardCodec'
import type { Board } from '../board/types'

// Brotli packs this binary data about 15% smaller than gzip (the browser's own CompressionStream has no brotli,
// so it is the brotli-wasm package, loaded only when a file is made or read). The best quality: the file is made once and read often.
// A browser reads it back without a library when it is served with the header Content-Encoding: br.
const QUALITY = 11

/** The finished file: encode, then brotli */
export async function boardToFile(board: Board): Promise<Blob> {
  const brotli = await (await import('brotli-wasm')).default
  return new Blob([brotli.compress(encodeBoard(board), { quality: QUALITY }) as BlobPart])
}

/** The board back from boardToFile's file */
export async function boardFromFile(file: Blob): Promise<Board> {
  const brotli = await (await import('brotli-wasm')).default
  return decodeBoard(brotli.decompress(new Uint8Array(await file.arrayBuffer())))
}
