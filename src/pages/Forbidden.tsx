import type { CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/lib/auth'
import { Button } from '@/components/ui/button'

const d = (n: number) => ({ '--d': n }) as CSSProperties

export function Forbidden() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const navigate = useNavigate()
  return (
    <main className="grid min-h-screen place-items-center bg-background p-6">
      <div className="stagger text-center">
        <p className="lbl-mono" style={d(0)}>
          403
        </p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight" style={d(1)}>
          {t('error.forbiddenTitle')}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground" style={d(2)}>
          {t('error.forbiddenSub')}
        </p>
        <div className="mt-6" style={d(3)}>
          <Button onClick={() => navigate(user ? `/${user.role.toLowerCase()}` : '/login')}>
            {t('error.backHome')}
          </Button>
        </div>
      </div>
    </main>
  )
}
