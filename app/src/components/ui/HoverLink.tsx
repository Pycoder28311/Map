import { Link, type LinkProps } from 'react-router-dom'

/** Text link that lifts slightly and draws an underline on hover. From the "Map buttons" theme */
export default function HoverLink({ className = '', children, ...link }: LinkProps) {
  return (
    <Link
      {...link}
      className={`group self-start text-body cursor-pointer rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900 ${className}`}
    >
      <span className="relative inline-block will-change-transform transition-[color,translate] duration-300 ease-out group-hover:-translate-y-px group-hover:text-neutral-700 after:absolute after:left-0 after:-bottom-px after:h-px after:w-full after:bg-current after:origin-left after:scale-x-0 after:transition-transform after:duration-300 after:ease-out group-hover:after:scale-x-100">
        {children}
      </span>
    </Link>
  )
}
