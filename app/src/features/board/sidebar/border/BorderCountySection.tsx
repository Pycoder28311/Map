import { useRef, useState } from 'react'
import { LuImagePlus, LuRefreshCw, LuTrash2 } from 'react-icons/lu'
import IconButton from '../../../../components/ui/buttons/IconButton'
import ErrorText from '../../../../components/ui/fields/ErrorText'
import Dropdown from '../../../../components/ui/overlays/Dropdown'
import { downscaleImage } from '../../../../lib/downscaleImage'
import { putImage, useImageUrl } from '../../../../mocks/imageStore'
import { TEXTURES } from '../../fillTextures'
import type { Fill } from '../../types'
import ColourOpacityRow from '../common/ColourOpacityRow'
import SidebarSection from '../common/SidebarSection'
import type { BorderSectionProps } from './borderRows'

const OPTIONS = TEXTURES.map((t, i) => ({ value: String(i), label: t.label }))
const START_OPACITY = 20

/** The fill with nothing left that looks like one is no fill */
const tidy = (fill: Fill): Fill | null => (fill.opacity > 0 || fill.texture || fill.image ? fill : null)

/**
 * The county's own look: colour, opacity, a texture over it and a picture to fill it with. They work on the same inside
 * as the Fill section.
 */
export default function BorderCountySection({ value, onChange }: BorderSectionProps) {
  const input = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const fill: Fill = value.fill ?? { color: value.style.color, opacity: 0 }
  const url = useImageUrl(fill.image)
  const set = (patch: Partial<Fill>, commit: boolean) => onChange({ fill: tidy({ ...fill, ...patch }) }, commit)

  const pick = async (file: File | undefined) => {
    if (!file) return
    setError(null)
    try {
      const image = putImage(await downscaleImage(file))
      // A picture at a faint opacity looks like nothing happened
      set({ image, opacity: fill.opacity < START_OPACITY * 2 ? 100 : fill.opacity }, true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The picture could not be read')
    }
  }

  return (
    <SidebarSection id="border-county" title="County">
      <div className="flex flex-col gap-2">
        <ColourOpacityRow
          colour={fill.color}
          onColourLive={(color) => set({ color, opacity: fill.opacity || START_OPACITY }, false)}
          onColourCommit={(color) => set({ color, opacity: fill.opacity || START_OPACITY }, true)}
          opacity={fill.opacity}
          minOpacity={0}
          onOpacity={(opacity) => set({ opacity }, true)}
        />
        <div className="flex items-center justify-between gap-2">
          <span className="text-small text-fg-muted">Texture</span>
          <Dropdown
            label="Texture"
            value={String(fill.texture ?? 0)}
            options={OPTIONS}
            onChange={(v) => set({ texture: Number(v) || undefined, opacity: fill.opacity || START_OPACITY }, true)}
          />
        </div>
        <input ref={input} type="file" accept="image/*" hidden onChange={(e) => { void pick(e.target.files?.[0]); e.target.value = '' }} />
        {url ? (
          <div className="group relative aspect-[16/7] overflow-hidden rounded-(--card-radius) bg-fill">
            <img src={url} alt="" className="size-full object-cover" />
            <div className="absolute end-2 top-2 flex gap-1 rounded-(--card-radius) bg-surface/90 p-0.5 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
              <IconButton icon={LuRefreshCw} label="Replace image" onClick={() => input.current?.click()} />
              <IconButton icon={LuTrash2} label="Remove image" onClick={() => set({ image: undefined }, true)} />
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => input.current?.click()}
            className="flex w-full cursor-pointer items-center justify-center gap-1 rounded-(--card-radius) border border-dashed border-line-strong py-3 text-small text-fg-muted hover-fill"
          >
            <LuImagePlus className="size-4" />
            Import image
          </button>
        )}
        <ErrorText>{error}</ErrorText>
      </div>
    </SidebarSection>
  )
}
