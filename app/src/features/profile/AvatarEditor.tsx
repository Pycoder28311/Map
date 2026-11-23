import { useRef, useState } from 'react'
import { LuCamera, LuLoaderCircle, LuUser } from 'react-icons/lu'
import IconButton from '../../components/ui/buttons/IconButton'
import { uploadImage } from '../../lib/api/images'
import { authClient } from '../../lib/auth-client'
import { downscaleImage } from '../../lib/downscaleImage'
import { IMAGE_ACCEPT } from '../../components/ui/editors/insertImages'

/** Longest side of a stored profile picture (it shows at 128px at most, so 512 is sharp on any screen) */
const AVATAR_MAX = 512

type Props = {
  name: string
  image: string | null | undefined
  /** Something went wrong (the page shows it), or null when a new try starts */
  onError: (message: string | null) => void
}

/**
 * The big profile picture, overlapping the banner. Its camera button picks a picture: made small (downscaleImage), uploaded
 * (the images API) and saved as the user's `image` (Better Auth's updateUser), so the navbar's circle changes with it.
 */
export default function AvatarEditor({ name, image, onError }: Props) {
  const picker = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)

  const change = async (file: File | undefined) => {
    if (!file) return
    setBusy(true)
    onError(null)
    try {
      const small = await downscaleImage(file, AVATAR_MAX)
      const url = await uploadImage(new File([small], 'avatar.jpg', { type: 'image/jpeg' }))
      const { error } = await authClient.updateUser({ image: url })
      if (error) onError(error.message ?? 'Could not save the picture')
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Could not upload the picture')
    }
    setBusy(false)
  }

  return (
    <div className="relative size-28 shrink-0 sm:size-32">
      <div className="size-full overflow-hidden rounded-(--corner-lg) bg-fill shadow-(--lift-shadow) ring-4 ring-surface-muted">
        {image ? (
          <img src={image} alt={name} className="size-full object-cover" />
        ) : (
          <span className="flex size-full items-center justify-center text-fg-subtle">
            <LuUser aria-hidden className="size-14" />
          </span>
        )}
        {busy && (
          <span className="absolute inset-0 flex items-center justify-center bg-black/50">
            <LuLoaderCircle aria-hidden className="size-8 animate-spin text-white" />
          </span>
        )}
      </div>
      <IconButton
        icon={LuCamera}
        label={image ? 'Change picture' : 'Add a picture'}
        filled
        bigIcon
        disabled={busy}
        onClick={() => picker.current?.click()}
        className="absolute -right-3 -bottom-3"
      />
      <input
        ref={picker}
        type="file"
        accept={IMAGE_ACCEPT}
        hidden
        onChange={(e) => {
          void change(e.target.files?.[0])
          e.target.value = ''
        }}
      />
    </div>
  )
}
