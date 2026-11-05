import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Smartphone, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useAuth } from '@/lib/auth'

export default function VolunteerNotice() {
  const { t } = useTranslation()
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
      <Card className="max-w-md w-full p-8 text-center space-y-6 shadow-card border-border bg-card">
        <div className="mx-auto size-16 rounded-full bg-brand-pine/10 text-brand-pine flex items-center justify-center">
          <Smartphone className="size-8" />
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-extrabold text-foreground tracking-tight">
            {t('features.volunteer.mobileNoticeTitle')}
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {t('features.volunteer.mobileNoticeDesc')}
          </p>
        </div>

        {user && (
          <div className="rounded-md border border-border bg-slate-50/50 p-3 text-xs text-muted-foreground text-left">
            <p>
              <span className="font-semibold text-foreground">{user.name}</span> ({user.email})
            </p>
            <p className="mt-1 font-mono text-[11px] text-brand-pine">Role: {user.rawRole ?? 'VOLUNTEER'}</p>
          </div>
        )}

        <div className="pt-2">
          <Button variant="outline" className="w-full gap-2" onClick={handleLogout}>
            <LogOut className="size-4" />
            {t('common.logout')}
          </Button>
        </div>
      </Card>
    </div>
  )
}
