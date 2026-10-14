import { useEffect, useRef } from 'react'
import { paintObject } from './render'
import type { StyledObject } from './types'

type Props = { object: StyledObject; width: number; height: number; className?: string }

/** A tiny canvas that paints one example object with the board's own renderer, in the theme's text colour */
export default function StyleSample({ object, width, height, className = '' }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const el = canvas.current
    const ctx = el?.getContext('2d')
    if (!el || !ctx) return
    const dpr = window.devicePixelRatio || 1
    el.width = width * dpr
    el.height = height * dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, width, height)
    const colour = getComputedStyle(el).color
    const themed = { ...object, style: { ...object.style, color: colour } }
    paintObject(ctx, themed, 1)
  }, [object, width, height])
  return <canvas ref={canvas} aria-hidden style={{ width, height }} className={`text-fg ${className}`} />
}
