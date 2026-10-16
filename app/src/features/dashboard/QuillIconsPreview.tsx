import type { IconType } from 'react-icons'
import { BsFeather, BsFeather2 } from 'react-icons/bs'
import { FaFeather, FaFeatherPointed, FaPenNib } from 'react-icons/fa6'
import { FiFeather } from 'react-icons/fi'
import { GiFeather, GiFountainPen, GiQuill, GiQuillInk, GiScrollQuill, GiTwoFeathers } from 'react-icons/gi'
import { ImQuill } from 'react-icons/im'
import { LiaFeatherAltSolid, LiaPenNibSolid } from 'react-icons/lia'
import { LuFeather } from 'react-icons/lu'
import { PiFeather, PiFeatherBold, PiFeatherFill, PiPenNib, PiPenNibStraight } from 'react-icons/pi'
import { RiQuillPenFill, RiQuillPenLine } from 'react-icons/ri'
import { TbFeather } from 'react-icons/tb'
import { TiFeather } from 'react-icons/ti'

// TEMPORARY: every quill / feather / pen-nib icon in react-icons, to pick one from. Delete this file (and its use in
// pages/Dashboard/DashboardPage.tsx) once one is chosen.
const ICONS: { name: string; Icon: IconType }[] = [
  { name: 'GiQuill', Icon: GiQuill },
  { name: 'GiQuillInk', Icon: GiQuillInk },
  { name: 'GiScrollQuill', Icon: GiScrollQuill },
  { name: 'GiFountainPen', Icon: GiFountainPen },
  { name: 'GiFeather', Icon: GiFeather },
  { name: 'GiTwoFeathers', Icon: GiTwoFeathers },
  { name: 'ImQuill', Icon: ImQuill },
  { name: 'RiQuillPenFill', Icon: RiQuillPenFill },
  { name: 'RiQuillPenLine', Icon: RiQuillPenLine },
  { name: 'FaFeatherPointed', Icon: FaFeatherPointed },
  { name: 'FaFeather', Icon: FaFeather },
  { name: 'FaPenNib', Icon: FaPenNib },
  { name: 'LuFeather', Icon: LuFeather },
  { name: 'FiFeather', Icon: FiFeather },
  { name: 'TbFeather', Icon: TbFeather },
  { name: 'TiFeather', Icon: TiFeather },
  { name: 'BsFeather', Icon: BsFeather },
  { name: 'BsFeather2', Icon: BsFeather2 },
  { name: 'PiFeather', Icon: PiFeather },
  { name: 'PiFeatherBold', Icon: PiFeatherBold },
  { name: 'PiFeatherFill', Icon: PiFeatherFill },
  { name: 'PiPenNib', Icon: PiPenNib },
  { name: 'PiPenNibStraight', Icon: PiPenNibStraight },
  { name: 'LiaFeatherAltSolid', Icon: LiaFeatherAltSolid },
  { name: 'LiaPenNibSolid', Icon: LiaPenNibSolid },
]

/** A grid of the icons with their names, to look at and choose from (temporary) */
export default function QuillIconsPreview() {
  return (
    <section aria-label="Quill icons" className="mt-28 flex flex-wrap gap-x-6 gap-y-5">
      {ICONS.map(({ name, Icon }) => (
        <figure key={name} className="flex w-24 flex-col items-center gap-2 text-fg">
          <Icon className="size-9" />
          <figcaption className="text-center text-small break-all text-fg-muted">{name}</figcaption>
        </figure>
      ))}
    </section>
  )
}
