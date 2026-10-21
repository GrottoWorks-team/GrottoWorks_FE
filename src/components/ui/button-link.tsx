import * as React from 'react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { buttonBase, buttonSizes, buttonVariants } from './button'

type Variant = keyof typeof buttonVariants
type Size = keyof typeof buttonSizes

interface ButtonLinkBase {
  variant?: Variant
  size?: Size
  className?: string
  children: React.ReactNode
  title?: string
}

type ButtonLinkProps = ButtonLinkBase &
  ({ to: string; href?: never } | { href: string; to?: never })

/**
 * Anchor/Link mang style của Button.
 * Trang công khai (landing/đăng ký) cần href thật để điều hướng và SEO, nhưng
 * lồng `<button>` trong `<a>` là HTML không hợp lệ — component này render thẳng
 * `<Link>`/`<a>` với class của Button thay vì bọc Button.
 */
export function ButtonLink({
  variant = 'default',
  size = 'default',
  className,
  children,
  title,
  to,
  href,
}: ButtonLinkProps) {
  const cls = cn(buttonBase, buttonVariants[variant], buttonSizes[size], className)
  if (to !== undefined) {
    return (
      <Link to={to} className={cls} title={title}>
        {children}
      </Link>
    )
  }
  return (
    <a href={href} className={cls} title={title}>
      {children}
    </a>
  )
}
