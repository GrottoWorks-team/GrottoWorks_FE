import type { CSSProperties, ReactNode } from 'react'

const d = (n: number) => ({ '--d': n }) as CSSProperties

export function PageHeader({
  title,
  sub,
  actions,
}: {
  title: string
  sub?: string
  actions?: ReactNode
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="stagger">
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground" style={d(0)}>
          {title}
        </h1>
        {sub && (
          <p className="mt-1 text-sm text-muted-foreground" style={d(1)}>
            {sub}
          </p>
        )}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  )
}
