import { LuChevronRight } from 'react-icons/lu'
import { Link, type LinkProps } from 'react-router-dom'

/** "See more"-style link with a chevron that lifts slightly on hover. From the "Map buttons" theme */
export default function SeeMoreLink({ className = '', children, ...link }: LinkProps) {
  return (
    <Link
      {...link}
      className={`group self-start text-body cursor-pointer rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900 ${className}`}
    >
      <span className="inline-flex items-center gap-0.5 will-change-transform transition-[color,translate] duration-300 ease-out group-hover:-translate-y-px group-hover:text-neutral-700">
        {children}
        <LuChevronRight className="size-[1em] shrink-0 translate-y-px" />
      </span>
    </Link>
  )
}
