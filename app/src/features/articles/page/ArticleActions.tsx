import { LuBookmark, LuEllipsis, LuInfo, LuLock, LuLockOpen, LuSearch, LuShare2 } from 'react-icons/lu'
import Button from '../../../components/ui/buttons/Button'
import BarPopover from '../../../components/ui/overlays/BarPopover'
import IconMenu from '../../../components/ui/tree/IconMenu'
import type { TreeMenuGroup } from '../../../components/ui/tree/types'
import ShareOptions from '../../share/ShareOptions'
import PrivacyPanel from '../../sharing/PrivacyPanel'
import type { useSharing } from '../../sharing/sharing'
import SaveButton from '../save/SaveButton'

type Props = {
  /** The article's name (the ⋯'s label) and its panel's key (`article:<id>`: Save, Share) */
  name: string
  panelKey: string
  /** The article is public (only a public article can be shared) */
  isPublic: boolean
  /** Its owner's page: Private / Public, Save and the item's actions in the ⋯; the others have Save by the title */
  isOwner: boolean
  /** Share's popout (the page holds it) */
  sharing: boolean
  onSharing: (open: boolean) => void
  /** Who can see the article (the ⋯'s Private / Public) */
  privacy: ReturnType<typeof useSharing>
  /** On this device's saved list (the owner's Save in the ⋯) */
  saved: boolean
  onSaved: (saved: boolean) => void
  /** The ⋯'s Info (how to edit the article) and Search in article */
  onInfo: () => void
  onFind: () => void
  /** Pin, move, Trash, delete: the owner's (useResourceMenu) */
  itemMenu: TreeMenuGroup[]
}

/** At the right end of the title's line: Import from Notes, Save (not the owner's), Share (a public article), and the ⋯ menu */
export default function ArticleActions({ name, panelKey, isPublic, isOwner, sharing, onSharing, privacy, saved, onSaved, onInfo, onFind, itemMenu }: Props) {
  return (
    <div className="relative flex items-center justify-end gap-3">
      {/* Not made yet: it will put the text of a note in the article */}
      <Button variant="text" size="md" disabled title="Add text from a note (soon)">
        Import from Notes
      </Button>
      {/* The owner's Private / Public is in the ⋯ menu; the others have Save here */}
      {!isOwner && <SaveButton panelKey={panelKey} />}
      {/* Only a public article can be shared */}
      {isPublic && (
        <BarPopover
          label="Share"
          open={sharing}
          onOpenChange={onSharing}
          align="end"
          trigger={
            <Button variant={sharing ? 'selected' : 'ghost'} size="sm" plain filled icon={LuShare2} aria-expanded={sharing} onClick={() => onSharing(!sharing)}>
              Share
            </Button>
          }
        >
          <ShareOptions id={panelKey} />
        </BarPopover>
      )}
      {/* A bigger ⋯ */}
      <span className="flex [--btn-icon-size:1.375rem]">
        <IconMenu
          label={`More: ${name}`}
          icon={LuEllipsis}
          turn={false}
          groups={[
            [
              // About editing the article (not the Info box)
              { label: 'Info', icon: LuInfo, onClick: onInfo },
              // Who can see it (the owner's): its panel opens beside the menu
              ...(isOwner
                ? [
                    {
                      label: privacy.visibility === 'public' ? 'Public' : 'Private',
                      icon: privacy.visibility === 'public' ? LuLockOpen : LuLock,
                      onClick: () => {},
                      panel: <PrivacyPanel sharing={privacy} what="article" />,
                    },
                  ]
                : []),
              { label: 'Search in article', icon: LuSearch, onClick: onFind },
              // The owner's Save (the others have it by the title)
              ...(isOwner ? [{ label: saved ? 'Saved' : 'Save', icon: LuBookmark, checked: saved, onClick: () => onSaved(!saved) }] : []),
            ],
            ...itemMenu,
          ]}
        />
      </span>
    </div>
  )
}
