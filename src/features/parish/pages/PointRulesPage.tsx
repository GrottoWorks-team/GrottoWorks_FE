// Trang quy tắc điểm (route /parish/point-rules): bảng hành động → điểm cộng,
// mỗi hàng input số editable. KHÔNG có model pointRules trong types/seed —
// state tĩnh trong component, persist localStorage 'grotto-point-rules'
// (nếu không có → dùng RULES mặc định). Lưu toàn bộ → toast.
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Save } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/toast'

const RULES_KEY = 'grotto-point-rules'

// Quy tắc mặc định — điểm vinh danh TNV theo hành động (types User.points).
const DEFAULT_RULES: { action: string; points: number }[] = [
  { action: 'Tham gia nhiệm vụ hoàn thành', points: 10 },
  { action: 'Nộp ảnh hiện trường đạt yêu cầu', points: 2 },
  { action: 'Chấm công đủ ca', points: 3 },
  { action: 'Quyên góp vật tư được nhận', points: 5 },
  { action: 'Quyên góp tiền (mỗi 500.000đ)', points: 5 },
  { action: 'Mua hộ vật tư được xác nhận', points: 4 },
  { action: 'Nhận đồ mượn từ cộng đoàn', points: 3 },
  { action: 'Hỗ trợ khu khác khi có yêu cầu', points: 6 },
]

type RuleRow = { action: string; points: number }

// localStorage JSON hỏng / shape sai → về mặc định.
function loadRules(): RuleRow[] {
  try {
    const raw = localStorage.getItem(RULES_KEY)
    if (raw) {
      const v = JSON.parse(raw) as RuleRow[]
      if (Array.isArray(v) && v.every((r) => typeof r?.action === 'string' && Number.isFinite(r?.points)))
        return v
    }
  } catch {
    // blob hỏng — dùng mặc định
  }
  return structuredClone(DEFAULT_RULES)
}

export default function PointRulesPage() {
  const { t } = useTranslation()
  const toast = useToast()
  const [rules, setRules] = useState<RuleRow[]>(loadRules)
  const [dirty, setDirty] = useState(false)

  // Lưu ngay khi rời trang (beforeunload) — save button là cam kết chính.
  useEffect(() => {
    const flush = () => localStorage.setItem(RULES_KEY, JSON.stringify(rules))
    window.addEventListener('beforeunload', flush)
    return () => {
      flush()
      window.removeEventListener('beforeunload', flush)
    }
  }, [rules])

  const setPoints = (i: number, points: number) => {
    setRules((rs) => rs.map((r, idx) => (idx === i ? { ...r, points } : r)))
    setDirty(true)
  }

  const save = () => {
    localStorage.setItem(RULES_KEY, JSON.stringify(rules))
    setDirty(false)
    toast(t('features.parish.rulesSaved'))
  }

  const total = rules.reduce((acc, r) => acc + r.points, 0)

  return (
    <div>
      <PageHeader
        title={t('features.parish.rulesTitle')}
        sub={t('features.parish.rulesSub')}
        actions={
          <Button onClick={save} disabled={!dirty}>
            <Save className="size-4" />
            {t('common.save')}
          </Button>
        }
      />

      <Card className="p-5">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th scope="col" className="lbl-mono px-4 py-3 text-left">
                  {t('features.parish.ruleAction')}
                </th>
                <th scope="col" className="lbl-mono px-4 py-3 text-right">
                  {t('features.parish.rulePoints')}
                </th>
              </tr>
            </thead>
            <tbody className="stagger">
              {rules.map((r, i) => (
                <tr
                  key={r.action}
                  style={{ '--d': i } as React.CSSProperties}
                  className="border-b border-border/60 last:border-0"
                >
                  <td className="px-4 py-2.5 font-semibold text-foreground">{r.action}</td>
                  <td className="px-4 py-2.5">
                    <Label htmlFor={`rule-${i}`} className="sr-only">
                      {t('features.parish.rulePoints')}
                    </Label>
                    <Input
                      id={`rule-${i}`}
                      type="number"
                      min={0}
                      value={r.points}
                      aria-label={r.action}
                      onChange={(e) => setPoints(i, Math.max(0, Number(e.target.value)))}
                      className="ml-auto h-9 w-24 text-right tabular"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <p className="lbl-mono mt-3">
        {t('common.total', { n: total })} {t('features.parish.rulePointsUnit')}
      </p>
    </div>
  )
}
