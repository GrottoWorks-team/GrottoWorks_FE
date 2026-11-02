// Trang Quy tắc điểm thi đua (route /parish/point-rules).
//
// Kết nối trực tiếp Reporting service qua GET /api/v1/recognition-rules (RecognitionRuleDto).
// Theo phân quyền BE (F-RPT-01):
//   - GET /recognition-rules: ADMIN & PARISH đọc được
//   - POST /recognition-rules: Chỉ ADMIN tạo/sửa được (403 với PARISH)
// Vì vậy màn hình này hoạt động ở chế độ ĐỌC (read-only), ẩn các nút tạo/sửa.
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Award, Download, Info, Layers, Search, ShieldCheck, Sparkles } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatCard } from '@/components/shared/StatCard'
import { EmptyState } from '@/components/shared/EmptyState'
import { StatusTag } from '@/components/shared/StatusTag'
import { exportCsv } from '@/lib/csv'
import { viDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useRecognitionRules } from '@/features/recognition/api'

export default function PointRulesPage() {
  const { t } = useTranslation()
  const { data: rules = [], isLoading } = useRecognitionRules()

  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'ALL' | 'ACTIVE'>('ALL')

  // Thống kê nhanh
  const stats = useMemo(() => {
    const total = rules.length
    const active = rules.filter(
      (r) => r.status.toUpperCase() === 'ACTIVE' || r.status.toUpperCase() === 'ACTIVE',
    ).length
    const maxPoints = rules.reduce((max, r) => Math.max(max, r.points), 0)
    const types = new Set(rules.map((r) => r.contributionTypeCode)).size
    return { total, active, maxPoints, types }
  }, [rules])

  // Lọc và tìm kiếm
  const filtered = useMemo(() => {
    return rules.filter((r) => {
      if (filter === 'ACTIVE' && r.status.toUpperCase() !== 'ACTIVE') return false
      if (!search.trim()) return true
      const q = search.toLowerCase()
      return (
        r.name.toLowerCase().includes(q) ||
        r.contributionTypeCode.toLowerCase().includes(q) ||
        (r.description && r.description.toLowerCase().includes(q))
      )
    })
  }, [rules, filter, search])

  const handleExportCsv = () => {
    if (!filtered.length) return
    const rows = filtered.map((r) => ({
      [t('features.pointRules.ruleName')]: r.name,
      [t('features.pointRules.contributionType')]: r.contributionTypeCode,
      [t('features.pointRules.points')]: r.points,
      [t('features.pointRules.version')]: `v${r.ruleVersion}`,
      [t('features.pointRules.effective')]: `${viDate(r.effectiveFrom)} - ${
        r.effectiveTo ? viDate(r.effectiveTo) : 'Hiện tại'
      }`,
      [t('features.pointRules.status')]: r.status,
      Mô_tả: r.description ?? '',
    }))
    exportCsv('quy-tac-diem-thuong.csv', rows)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader
          title={t('features.pointRules.title')}
          sub={t('features.pointRules.sub')}
        />
        <Button
          variant="secondary"
          size="sm"
          onClick={handleExportCsv}
          disabled={filtered.length === 0}
          className="self-start sm:self-auto"
        >
          <Download className="mr-1.5 size-4" />
          {t('features.pointRules.exportCsv')}
        </Button>
      </div>

      {/* Thông báo quyền xem Read-Only */}
      <div className="flex items-center gap-2.5 rounded-lg border border-brand-pine/20 bg-brand-pineLight/30 px-4 py-3 text-sm text-foreground">
        <Info className="size-4 shrink-0 text-primary" />
        <p className="text-xs sm:text-sm">
          {t('features.pointRules.readOnlyNotice')}
        </p>
      </div>

      {/* 4 StatCards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          icon={Layers}
          label={t('features.pointRules.statTotal')}
          value={stats.total}
        />
        <StatCard
          icon={ShieldCheck}
          label={t('features.pointRules.statActive')}
          value={stats.active}
        />
        <StatCard
          icon={Award}
          label={t('features.pointRules.statMaxPoints')}
          value={stats.maxPoints}
          unit="pts"
        />
        <StatCard
          icon={Sparkles}
          label={t('features.pointRules.statTypes')}
          value={stats.types}
        />
      </div>

      {/* Bộ lọc và tìm kiếm */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative min-w-[240px] max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`${t('common.search')}...`}
            className="w-full rounded-md border border-input bg-card py-2 pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <div className="flex gap-1 rounded-full border border-border bg-card p-1">
          {(['ALL', 'ACTIVE'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={cn(
                'rounded-full px-3.5 py-1 text-xs font-semibold transition-colors',
                filter === f
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {f === 'ALL'
                ? t('features.pointRules.filterAll')
                : t('features.pointRules.filterActive')}
            </button>
          ))}
        </div>
      </div>

      {/* Bảng quy tắc tính điểm */}
      <Card className="overflow-hidden">
        {filtered.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-muted/40 text-xs font-semibold uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">{t('features.pointRules.ruleName')}</th>
                  <th className="px-4 py-3">{t('features.pointRules.contributionType')}</th>
                  <th className="px-4 py-3 text-center">{t('features.pointRules.points')}</th>
                  <th className="px-4 py-3 text-center">{t('features.pointRules.version')}</th>
                  <th className="px-4 py-3">{t('features.pointRules.effective')}</th>
                  <th className="px-4 py-3 text-right">{t('features.pointRules.status')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((rule) => (
                  <tr key={rule.id} className="transition-colors hover:bg-muted/20">
                    <td className="px-4 py-3.5">
                      <div className="font-medium text-foreground">{rule.name}</div>
                      {rule.description && (
                        <div className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                          {rule.description}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="font-mono text-xs rounded bg-muted px-2 py-0.5">
                        {rule.contributionTypeCode}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span className="inline-flex items-center gap-1 rounded-full bg-brand-gold/20 px-2.5 py-0.5 text-xs font-bold text-amber-700 dark:text-amber-300">
                        <Award className="size-3" />
                        +{rule.points}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-center font-mono text-xs text-muted-foreground">
                      v{rule.ruleVersion}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-muted-foreground">
                      <div>Từ: {viDate(rule.effectiveFrom)}</div>
                      {rule.effectiveTo ? (
                        <div>Đến: {viDate(rule.effectiveTo)}</div>
                      ) : (
                        <div className="text-primary font-medium">Hiện tại</div>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <StatusTag status={rule.status.toUpperCase()} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            text={
              isLoading
                ? t('common.loading')
                : t('features.pointRules.empty')
            }
          />
        )}
      </Card>
    </div>
  )
}
