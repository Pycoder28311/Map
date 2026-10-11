import { useDropZone } from '../drag/objectDrop'
import { linkZone } from './linkNode'

/** Registers the 'link' drop zone (notes dropped on link nodes get linked); render once in the app */
export default function LinkZone() {
  useDropZone('link', linkZone)
  return null
}
