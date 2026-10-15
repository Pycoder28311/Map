import { LuHexagon, LuMapPin, LuShapes, LuSpline, LuType } from 'react-icons/lu'
import type { PlainIcon } from '../../components/ui/icons/IconSlot'
import type { ObjectKind } from './types'

/** The icon of each kind of object in the lists of objects (layers, nearby) */
export const KIND_ICON: Record<ObjectKind, PlainIcon> = { line: LuSpline, border: LuHexagon, shape: LuShapes, text: LuType, point: LuMapPin }
