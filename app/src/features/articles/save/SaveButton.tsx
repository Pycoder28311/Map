import { LuBookmark, LuBookmarkCheck } from 'react-icons/lu'
import Button from '../../../components/ui/buttons/Button'
import { useSaved } from './savedStore'

/** Save, for a reader of the article (in Private / Public's place): puts it in their saved list, or takes it out */
export default function SaveButton({ panelKey }: { panelKey: string }) {
  const [saved, setSaved] = useSaved(panelKey)
  return (
    <Button variant={saved ? 'selected' : 'ghost'} size="sm" plain icon={saved ? LuBookmarkCheck : LuBookmark} aria-pressed={saved} onClick={() => setSaved(!saved)}>
      {saved ? 'Saved' : 'Save'}
    </Button>
  )
}
