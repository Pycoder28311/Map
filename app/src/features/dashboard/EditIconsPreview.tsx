import type { IconType } from 'react-icons'
import { AiFillEdit, AiOutlineEdit, AiOutlinePlus } from 'react-icons/ai'
import { BsPencil, BsPencilSquare, BsPlusCircle, BsPlusLg, BsPlusSquare } from 'react-icons/bs'
import { CiCirclePlus, CiEdit, CiPen } from 'react-icons/ci'
import { FaCirclePlus, FaPen, FaPenClip, FaPenToSquare, FaPencil, FaPlus, FaSquarePlus, FaWandMagicSparkles } from 'react-icons/fa6'
import { FiEdit, FiEdit2, FiEdit3, FiPlus, FiPlusCircle, FiPlusSquare } from 'react-icons/fi'
import { GiMagicLamp, GiMagicSwirl, GiPencil, GiPencilBrush, GiSparkles } from 'react-icons/gi'
import { HiOutlinePencil, HiOutlinePencilSquare, HiOutlinePlus, HiOutlinePlusCircle, HiPencil } from 'react-icons/hi2'
import { ImPencil, ImPencil2, ImPlus } from 'react-icons/im'
import { IoAdd, IoAddCircleOutline, IoCreate, IoCreateOutline, IoPencil, IoPencilOutline } from 'react-icons/io5'
import { LuCirclePlus, LuFilePen, LuFilePlus, LuFolderPlus, LuListPlus, LuNotebookPen, LuPen, LuPenLine, LuPenTool, LuPencil, LuPencilLine, LuPencilRuler, LuPlus, LuSparkles, LuSquarePen, LuSquarePlus, LuStickyNote, LuWand } from 'react-icons/lu'
import { MdAdd, MdAddCircleOutline, MdCreate, MdEdit, MdEditNote, MdNoteAdd, MdOutlineCreate, MdOutlineEdit, MdPostAdd } from 'react-icons/md'
import { PiMagicWand, PiNotePencil, PiPencil, PiPencilLine, PiPencilSimple, PiPencilSimpleLine, PiPlus, PiPlusCircle, PiPlusSquare, PiSparkle } from 'react-icons/pi'
import { RiAddCircleLine, RiAddLine, RiEdit2Line, RiEditFill, RiEditLine, RiMagicLine, RiPencilFill, RiPencilLine, RiPencilRulerLine } from 'react-icons/ri'
import { TbCirclePlus, TbEdit, TbPencil, TbPencilMinus, TbPencilPlus, TbPencilStar, TbPlus, TbWand } from 'react-icons/tb'

// TEMPORARY: pencil / editing / create / add icons in react-icons, to pick from (like QuillIconsPreview). Delete this file
// and its use in pages/Dashboard/DashboardPage.tsx once chosen.
const ICONS: { name: string; Icon: IconType }[] = [
  { name: 'LuPencil', Icon: LuPencil },
  { name: 'LuPencilLine', Icon: LuPencilLine },
  { name: 'LuPen', Icon: LuPen },
  { name: 'LuPenLine', Icon: LuPenLine },
  { name: 'LuPenTool', Icon: LuPenTool },
  { name: 'LuSquarePen', Icon: LuSquarePen },
  { name: 'LuFilePen', Icon: LuFilePen },
  { name: 'LuFilePlus', Icon: LuFilePlus },
  { name: 'LuPlus', Icon: LuPlus },
  { name: 'LuCirclePlus', Icon: LuCirclePlus },
  { name: 'LuSquarePlus', Icon: LuSquarePlus },
  { name: 'LuSparkles', Icon: LuSparkles },
  { name: 'LuWand', Icon: LuWand },
  { name: 'LuNotebookPen', Icon: LuNotebookPen },
  { name: 'LuPencilRuler', Icon: LuPencilRuler },
  { name: 'LuListPlus', Icon: LuListPlus },
  { name: 'LuFolderPlus', Icon: LuFolderPlus },
  { name: 'LuStickyNote', Icon: LuStickyNote },
  { name: 'FaPencil', Icon: FaPencil },
  { name: 'FaPen', Icon: FaPen },
  { name: 'FaPenToSquare', Icon: FaPenToSquare },
  { name: 'FaPenClip', Icon: FaPenClip },
  { name: 'FaPlus', Icon: FaPlus },
  { name: 'FaSquarePlus', Icon: FaSquarePlus },
  { name: 'FaCirclePlus', Icon: FaCirclePlus },
  { name: 'FaWandMagicSparkles', Icon: FaWandMagicSparkles },
  { name: 'MdEdit', Icon: MdEdit },
  { name: 'MdOutlineEdit', Icon: MdOutlineEdit },
  { name: 'MdCreate', Icon: MdCreate },
  { name: 'MdOutlineCreate', Icon: MdOutlineCreate },
  { name: 'MdAdd', Icon: MdAdd },
  { name: 'MdAddCircleOutline', Icon: MdAddCircleOutline },
  { name: 'MdPostAdd', Icon: MdPostAdd },
  { name: 'MdEditNote', Icon: MdEditNote },
  { name: 'MdNoteAdd', Icon: MdNoteAdd },
  { name: 'RiPencilFill', Icon: RiPencilFill },
  { name: 'RiPencilLine', Icon: RiPencilLine },
  { name: 'RiEditLine', Icon: RiEditLine },
  { name: 'RiEditFill', Icon: RiEditFill },
  { name: 'RiEdit2Line', Icon: RiEdit2Line },
  { name: 'RiAddLine', Icon: RiAddLine },
  { name: 'RiAddCircleLine', Icon: RiAddCircleLine },
  { name: 'RiPencilRulerLine', Icon: RiPencilRulerLine },
  { name: 'RiMagicLine', Icon: RiMagicLine },
  { name: 'PiPencil', Icon: PiPencil },
  { name: 'PiPencilSimple', Icon: PiPencilSimple },
  { name: 'PiPencilLine', Icon: PiPencilLine },
  { name: 'PiNotePencil', Icon: PiNotePencil },
  { name: 'PiPencilSimpleLine', Icon: PiPencilSimpleLine },
  { name: 'PiPlus', Icon: PiPlus },
  { name: 'PiPlusCircle', Icon: PiPlusCircle },
  { name: 'PiPlusSquare', Icon: PiPlusSquare },
  { name: 'PiMagicWand', Icon: PiMagicWand },
  { name: 'PiSparkle', Icon: PiSparkle },
  { name: 'TbPencil', Icon: TbPencil },
  { name: 'TbEdit', Icon: TbEdit },
  { name: 'TbPencilPlus', Icon: TbPencilPlus },
  { name: 'TbPlus', Icon: TbPlus },
  { name: 'TbCirclePlus', Icon: TbCirclePlus },
  { name: 'TbPencilStar', Icon: TbPencilStar },
  { name: 'TbWand', Icon: TbWand },
  { name: 'TbPencilMinus', Icon: TbPencilMinus },
  { name: 'FiEdit', Icon: FiEdit },
  { name: 'FiEdit2', Icon: FiEdit2 },
  { name: 'FiEdit3', Icon: FiEdit3 },
  { name: 'FiPlus', Icon: FiPlus },
  { name: 'FiPlusCircle', Icon: FiPlusCircle },
  { name: 'FiPlusSquare', Icon: FiPlusSquare },
  { name: 'HiOutlinePencil', Icon: HiOutlinePencil },
  { name: 'HiOutlinePencilSquare', Icon: HiOutlinePencilSquare },
  { name: 'HiPencil', Icon: HiPencil },
  { name: 'HiOutlinePlus', Icon: HiOutlinePlus },
  { name: 'HiOutlinePlusCircle', Icon: HiOutlinePlusCircle },
  { name: 'IoCreateOutline', Icon: IoCreateOutline },
  { name: 'IoCreate', Icon: IoCreate },
  { name: 'IoPencil', Icon: IoPencil },
  { name: 'IoPencilOutline', Icon: IoPencilOutline },
  { name: 'IoAdd', Icon: IoAdd },
  { name: 'IoAddCircleOutline', Icon: IoAddCircleOutline },
  { name: 'BsPencil', Icon: BsPencil },
  { name: 'BsPencilSquare', Icon: BsPencilSquare },
  { name: 'BsPlusLg', Icon: BsPlusLg },
  { name: 'BsPlusCircle', Icon: BsPlusCircle },
  { name: 'BsPlusSquare', Icon: BsPlusSquare },
  { name: 'GiPencil', Icon: GiPencil },
  { name: 'GiPencilBrush', Icon: GiPencilBrush },
  { name: 'GiMagicSwirl', Icon: GiMagicSwirl },
  { name: 'GiMagicLamp', Icon: GiMagicLamp },
  { name: 'GiSparkles', Icon: GiSparkles },
  { name: 'AiOutlineEdit', Icon: AiOutlineEdit },
  { name: 'AiOutlinePlus', Icon: AiOutlinePlus },
  { name: 'AiFillEdit', Icon: AiFillEdit },
  { name: 'ImPencil', Icon: ImPencil },
  { name: 'ImPencil2', Icon: ImPencil2 },
  { name: 'ImPlus', Icon: ImPlus },
  { name: 'CiEdit', Icon: CiEdit },
  { name: 'CiPen', Icon: CiPen },
  { name: 'CiCirclePlus', Icon: CiCirclePlus },
]

/** A grid of the icons with their names, to look at and choose from (temporary) */
export default function EditIconsPreview() {
  return (
    <section aria-label="Pencil, edit and create icons" className="flex flex-wrap gap-x-6 gap-y-5">
      {ICONS.map(({ name, Icon }) => (
        <figure key={name} className="flex w-24 flex-col items-center gap-2 text-fg">
          <Icon className="size-9" />
          <figcaption className="text-center text-small break-all text-fg-muted">{name}</figcaption>
        </figure>
      ))}
    </section>
  )
}
