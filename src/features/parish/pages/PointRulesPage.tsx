// Trang vinh danh (route /parish/point-rules): quản lý THẬT qua Reporting service
//   • Loại đóng góp : GET/POST /api/v1/contribution-types, PATCH /{id}
//   • Quy tắc điểm  : GET/POST /api/v1/recognition-rules, POST /{id}/deactivate
// Bố cục/màu/cỡ chữ lấy đúng bản thiết kế Pen "Quy Tắc Điểm — Vinh Danh".
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ArrowRight,
  CircleSlash,
  Download,
  Info,
  Layers,
  Plus,
  Star,
  Target,
} from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatCard } from '@/components/shared/StatCard'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/toast'
import { ApiError } from '@/lib/api'
import { exportCsv } from '@/lib/csv'
import { cn } from '@/lib/utils'
import {
  useContributionTypes,
  useCreateContributionType,
  useCreateRecognitionRule,
  useDeactivateRecognitionRule,
  useRecognitionRules,
  useUpdateContributionType,
  type RecognitionRuleDto,
} from '@/features/recognition/api'

type Tab = 'rules' | 'types'

const TEXTAREA_CLS =
  'mt-1 w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground transition-colors focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30'

const SELECT_CLS =
  'h-10 w-full rounded-md border border-border bg-card px-3 text-sm text-foreground transition-colors focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30'

const CARD = 'w-full overflow-hidden rounded-[16px] border border-[#E3EAE0] bg-white shadow-[0px_1px_2px_#06281B0A]'
const RULE = 'h-px w-full bg-[#ECF1E9]'
const TH = 'font-mono text-[9px] font-semibold uppercase tracking-[1.1px] text-[#8C9F94]'

const today = () => new Date().toISOString().slice(0, 10)

export default function PointRulesPage() {
  const { t } = useTranslation()
  const toast = useToast()
  const [tab, setTab] = useState<Tab>('rules')

  const rulesQuery = useRecognitionRules()
  const typesQuery = useContributionTypes()
  const createRule = useCreateRecognitionRule()
  const createType = useCreateContributionType()
  const updateType = useUpdateContributionType()
  const deactivate = useDeactivateRecognitionRule()

  const [ruleOpen, setRuleOpen] = useState(false)
  const [ruleName, setRuleName] = useState('')
  const [ruleTypeId, setRuleTypeId] = useState('')
  const [rulePoints, setRulePoints] = useState('10')
  const [ruleNote, setRuleNote] = useState('')
  const [ruleFrom, setRuleFrom] = useState(today())

  const [typeOpen, setTypeOpen] = useState(false)
  const [typeCode, setTypeCode] = useState('')
  const [typeName, setTypeName] = useState('')
  const [typeNote, setTypeNote] = useState('')

  const [deactivateTarget, setDeactivateTarget] = useState<RecognitionRuleDto | null>(null)
  const [deactivateReason, setDeactivateReason] = useState('')

  const fail = (error: unknown) =>
    toast(error instanceof ApiError ? error.message : t('common.error'), 'alert')

  const rules = rulesQuery.data ?? []
  const types = typesQuery.data ?? []
  const activeRules = rules.filter((r) => r.status === 'ACTIVE')
  const activeRule = activeRules[0]
  const pausedCount = rules.length - activeRules.length
  const year = new Date().getFullYear()

  const submitRule = async () => {
    try {
      await createRule.mutateAsync({
        contributionTypeId: ruleTypeId,
        name: ruleName.trim(),
        points: Number(rulePoints),
        description: ruleNote.trim() || null,
        effectiveFrom: ruleFrom,
      })
      toast(t('features.parish.ruleCreated'))
      setRuleOpen(false)
      setRuleName('')
      setRuleNote('')
      setRulePoints('10')
    } catch (error) {
      fail(error)
    }
  }

  const submitType = async () => {
    try {
      await createType.mutateAsync({
        code: typeCode.trim().toUpperCase(),
        name: typeName.trim(),
        description: typeNote.trim() || null,
      })
      toast(t('features.parish.typeCreated'))
      setTypeOpen(false)
      setTypeCode('')
      setTypeName('')
      setTypeNote('')
    } catch (error) {
      fail(error)
    }
  }

  const confirmDeactivate = async () => {
    if (!deactivateTarget) return
    try {
      await deactivate.mutateAsync({
        ruleId: deactivateTarget.id,
        version: deactivateTarget.version,
        reason: deactivateReason.trim(),
      })
      toast(t('features.parish.ruleDeactivated'))
      setDeactivateTarget(null)
      setDeactivateReason('')
    } catch (error) {
      fail(error)
    }
  }

  const exportCurrent = () => {
    if (tab === 'rules') {
      exportCsv(
        `quy-tac-diem-${today()}.csv`,
        rules.map((r) => ({
          [t('features.parish.ruleName')]: r.name,
          [t('features.parish.typeCode')]: `${r.contributionTypeCode} · v${r.ruleVersion}`,
          [t('features.parish.rulePoints')]: r.points,
          [t('features.parish.ruleEffectiveFrom')]: r.effectiveFrom,
          [t('common.status')]: t(`status.${r.status}`),
        })),
      )
    } else {
      exportCsv(
        `loai-dong-gop-${today()}.csv`,
        types.map((ct) => ({
          [t('features.parish.typeCode')]: ct.code,
          [t('features.parish.typeName')]: ct.name,
          [t('common.status')]: t(`status.${ct.status}`),
        })),
      )
    }
  }

  const statusPill = (status: 'ACTIVE' | 'INACTIVE') =>
    status === 'ACTIVE' ? (
      <span className="inline-flex items-center gap-[6px] rounded-full border border-[#CBE3D2] bg-[#E9F4EC] px-[9px] py-1">
        <span className="size-[5px] rounded-full bg-[#12805A]" aria-hidden />
        <span className="text-[10px] font-semibold text-[#1B6B45]">{t('status.ACTIVE')}</span>
      </span>
    ) : (
      <span className="inline-flex items-center gap-[6px] rounded-full border border-[#EDD9A6] bg-[#FCF3DE] px-[9px] py-1">
        <span className="size-[5px] rounded-full bg-[#C98A12]" aria-hidden />
        <span className="text-[10px] font-semibold text-[#9A6A0C]">
          {t('features.parish.statusPaused', { defaultValue: 'Tạm dừng' })}
        </span>
      </span>
    )

  return (
    <div className="flex flex-col gap-[16px]">
      <PageHeader
        title={t('features.parish.rulesTitle')}
        sub={t('features.parish.rulesSub')}
        actions={
          <>
            <button
              type="button"
              onClick={exportCurrent}
              className="flex h-[38px] items-center gap-[7px] rounded-[11px] border border-[#DBE5D6] bg-white px-3 transition-colors hover:bg-[#F4F8F1]"
            >
              <Download className="size-[14px] text-[#5C7468]" aria-hidden />
              <span className="text-[12px] font-semibold text-[#2C463A]">
                {t('features.parish.rulesExport', { defaultValue: 'Xuất quy tắc' })}
              </span>
            </button>
            <button
              type="button"
              onClick={() => (tab === 'rules' ? setRuleOpen(true) : setTypeOpen(true))}
              className="flex h-[38px] items-center gap-[7px] rounded-[11px] bg-[#0A5C36] px-[13px] shadow-[0px_6px_14px_#0A5C362E] transition-colors hover:bg-[#0D7344]"
            >
              <Plus className="size-[14px] text-white" aria-hidden />
              <span className="text-[12px] font-bold text-white">
                {tab === 'rules' ? t('features.parish.addRule') : t('features.parish.addType')}
              </span>
            </button>
          </>
        }
      />

      {/* Tab + chip đếm */}
      <div className="flex w-full flex-wrap items-center justify-between gap-[16px]">
        <div className="flex w-fit gap-[4px] rounded-[12px] bg-[#EAF0E6] p-[4px]" role="tablist">
          {(['rules', 'types'] as const).map((value) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={tab === value}
              onClick={() => setTab(value)}
              className={cn(
                'flex h-[32px] items-center justify-center rounded-[9px] px-[13px] text-[12px] transition-colors',
                tab === value
                  ? 'bg-white font-bold text-[#0A5C36] shadow-[0px_1px_3px_#06281B1A]'
                  : 'font-medium text-[#7C9287] hover:text-[#0B2E1F]',
              )}
            >
              {value === 'rules' ? t('features.parish.tabRules') : t('features.parish.tabTypes')}
            </button>
          ))}
        </div>
        <span className="flex w-fit items-center gap-[6px] rounded-full border border-[#E3EAE0] bg-white px-[10px] py-[5px]">
          <Layers className="size-3 text-[#4F7A61]" aria-hidden />
          <span className="text-[10.5px] font-semibold text-[#4F7A61]">
            {t('features.parish.rulesChip', {
              defaultValue: '{{n}} quy tắc đang chạy · mùa {{year}}',
              n: activeRules.length,
              year,
            })}
          </span>
        </span>
      </div>

      {/* Thẻ số liệu */}
      <div className="grid gap-[14px] sm:grid-cols-3">
        <StatCard
          label={t('features.parish.statRules', { defaultValue: 'Quy tắc điểm' })}
          value={rules.length}
          hint={t('features.parish.statRulesSub', { defaultValue: 'Cấu hình cho mùa {{year}}', year })}
          icon={Star}
        />
        <StatCard
          label={t('features.parish.statActive', { defaultValue: 'Đang áp dụng' })}
          value={activeRules.length}
          hint={
            pausedCount > 0
              ? t('features.parish.statActivePausedSub', {
                  defaultValue: '{{n}} quy tắc tạm dừng',
                  n: pausedCount,
                })
              : t('features.parish.statActiveSub', { defaultValue: 'Không có quy tắc tạm dừng' })
          }
          tone="ok"
          icon={Target}
        />
        <StatCard
          label={t('features.parish.statPointsPerTask', { defaultValue: 'Điểm mỗi task' })}
          value={activeRule ? activeRule.points : '—'}
          hint={t('features.parish.statPointsSub', { defaultValue: 'Cộng điểm khi hoàn thành task' })}
          tone="warn"
          icon={Star}
        />
      </div>

      <div className="flex w-full flex-col items-start gap-[16px] xl:flex-row">
        {/* Cột bảng */}
        <div className="flex w-full min-w-0 flex-1 flex-col">
          <section className={CARD}>
            <div className="flex w-full items-center justify-between px-[18px] py-[14px]">
              <p className="font-mono text-[9.5px] font-semibold uppercase tracking-[1.2px] text-[#8C9F94]">
                {tab === 'rules' ? t('features.parish.tabRules') : t('features.parish.tabTypes')}
              </p>
              <span className="flex items-center gap-[6px] rounded-full bg-[#F1F6EE] px-[9px] py-1">
                <Layers className="size-[11px] text-[#4F7A61]" aria-hidden />
                <span className="text-[10px] font-bold text-[#4F7A61]">
                  {tab === 'rules'
                    ? t('features.parish.rulesCountChip', { defaultValue: '{{n}} quy tắc', n: rules.length })
                    : t('features.parish.typesCountChip', { defaultValue: '{{n}} loại', n: types.length })}
                </span>
              </span>
            </div>
            <div className={RULE} aria-hidden />

            {tab === 'rules' ? (
              <>
                <div className="flex w-full items-center gap-4 bg-[#F7F9F5] px-4 py-[10px]">
                  <span className={cn(TH, 'min-w-0 flex-1')}>{t('features.parish.ruleName')}</span>
                  <span className={cn(TH, 'w-[70px] shrink-0 text-right')}>{t('features.parish.rulePoints')}</span>
                  <span className={cn(TH, 'w-[104px] shrink-0 text-right')}>
                    {t('features.parish.ruleEffectiveFrom')}
                  </span>
                  <span className={cn(TH, 'w-[98px] shrink-0')}>{t('common.status')}</span>
                  <span className={cn(TH, 'w-[180px] shrink-0 text-right')}>{t('common.actions')}</span>
                </div>

                {rulesQuery.isPending ? (
                  <p className="px-4 py-6 font-mono text-xs text-[#8AA298]">{t('common.loading')}</p>
                ) : rules.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-2 py-10">
                    <CircleSlash className="size-[18px] text-[#C3D2C7]" aria-hidden />
                    <p className="text-[11px] text-[#A3B4A9]">{t('features.parish.rulesEmpty')}</p>
                    <button
                      type="button"
                      onClick={() => setRuleOpen(true)}
                      className="flex items-center gap-[6px] rounded-full border border-[#E7EEE3] bg-[#F7F9F5] px-[10px] py-[5px]"
                    >
                      <Plus className="size-[11px] text-[#6B8175]" aria-hidden />
                      <span className="text-[10px] font-semibold text-[#6B8175]">
                        {t('features.parish.addRuleNew', { defaultValue: 'Thêm quy tắc mới' })}
                      </span>
                    </button>
                  </div>
                ) : (
                  <ul className="w-full">
                    {rules.map((r) => (
                      <li
                        key={r.id}
                        className="flex w-full items-center gap-3 border-b border-[#F0F4EC] px-4 py-[11px] last:border-0"
                      >
                        <div className="flex min-w-0 flex-1 items-center gap-[10px]">
                          <span className="grid size-[30px] shrink-0 place-items-center rounded-[9px] border border-[#DDE8D6] bg-[#EDF4EA]">
                            <Star className="size-[14px] text-[#4F7A61]" aria-hidden />
                          </span>
                          <div className="flex min-w-0 flex-1 flex-col gap-px">
                            <span className="w-full truncate text-[12px] font-bold text-[#0B2E1F]">{r.name}</span>
                            <span className="w-full truncate font-mono text-[9.5px] text-[#9AAE9F]">
                              {r.contributionTypeCode} · v{r.ruleVersion}
                            </span>
                          </div>
                        </div>
                        <span className="flex w-[70px] shrink-0 items-center justify-end gap-[5px]">
                          <Star className="size-3 text-[#C9A227]" aria-hidden />
                          <span className="font-mono text-[12px] font-bold text-[#0B2E1F]">{r.points}</span>
                        </span>
                        <span className="w-[104px] shrink-0 text-right font-mono text-[10.5px] text-[#5C7468]">
                          {r.effectiveFrom}
                        </span>
                        <span className="w-[98px] shrink-0">{statusPill(r.status)}</span>
                        <div className="flex w-[180px] shrink-0 items-center justify-end gap-[6px]">
                          {r.status === 'ACTIVE' ? (
                            <button
                              type="button"
                              onClick={() => {
                                setDeactivateReason('')
                                setDeactivateTarget(r)
                              }}
                              className="flex h-[30px] items-center rounded-[9px] border border-[#E7EEE3] bg-white px-[10px] transition-colors hover:bg-[#F4F8F1]"
                            >
                              <span className="text-[10.5px] font-semibold text-[#6B8175]">
                                {t('features.parish.ruleDeactivate')}
                              </span>
                            </button>
                          ) : (
                            <span className="text-[10.5px] text-[#A3B4A9]">—</span>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="flex w-full items-center justify-between border-t border-[#ECF1E9] px-4 py-[11px]">
                  <span className="text-[10.5px] text-[#96AAA0]">
                    {t('features.parish.rulesAutoNote', {
                      defaultValue: 'Điểm được cộng tự động khi task chuyển sang trạng thái Hoàn thành.',
                    })}
                  </span>
                  <button
                    type="button"
                    onClick={() => setTab('types')}
                    className="flex shrink-0 items-center gap-[5px] text-[10.5px] font-bold text-[#0A5C36] hover:underline"
                  >
                    {t('features.parish.viewTypes', { defaultValue: 'Xem loại đóng góp' })}
                    <ArrowRight className="size-[11px]" aria-hidden />
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="flex w-full items-center gap-4 bg-[#F7F9F5] px-4 py-[10px]">
                  <span className={cn(TH, 'w-[160px] shrink-0')}>{t('features.parish.typeCode')}</span>
                  <span className={cn(TH, 'min-w-0 flex-1')}>{t('features.parish.typeName')}</span>
                  <span className={cn(TH, 'w-[98px] shrink-0')}>{t('common.status')}</span>
                  <span className={cn(TH, 'w-[180px] shrink-0 text-right')}>{t('common.actions')}</span>
                </div>

                {typesQuery.isPending ? (
                  <p className="px-4 py-6 font-mono text-xs text-[#8AA298]">{t('common.loading')}</p>
                ) : types.length === 0 ? (
                  <p className="px-4 py-8 text-center text-[11px] text-[#A3B4A9]">
                    {t('features.parish.typesEmpty')}
                  </p>
                ) : (
                  <ul className="w-full">
                    {types.map((ct) => (
                      <li
                        key={ct.id}
                        className="flex w-full items-center gap-3 border-b border-[#F0F4EC] px-4 py-[11px] last:border-0"
                      >
                        <span className="w-[160px] shrink-0 truncate font-mono text-[10.5px] text-[#5C7468]">
                          {ct.code}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-[12px] font-bold text-[#0B2E1F]">
                          {ct.name}
                        </span>
                        <span className="w-[98px] shrink-0">{statusPill(ct.status)}</span>
                        <div className="flex w-[180px] shrink-0 items-center justify-end">
                          <button
                            type="button"
                            disabled={ct.system || updateType.isPending}
                            onClick={() =>
                              updateType.mutate(
                                {
                                  typeId: ct.id,
                                  status: ct.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE',
                                },
                                { onError: fail },
                              )
                            }
                            className="flex h-[30px] items-center rounded-[9px] border border-[#E7EEE3] bg-white px-[10px] transition-colors hover:bg-[#F4F8F1] disabled:opacity-50"
                          >
                            <span className="text-[10.5px] font-semibold text-[#6B8175]">
                              {ct.status === 'ACTIVE'
                                ? t('features.parish.typeDeactivate')
                                : t('features.parish.typeActivate')}
                            </span>
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="flex w-full items-center justify-between border-t border-[#ECF1E9] px-4 py-[11px]">
                  <span className="text-[10.5px] text-[#96AAA0]">
                    {t('features.parish.typesNote', {
                      defaultValue: 'Loại đóng góp hệ thống không thể tắt — dùng cho quy tắc điểm.',
                    })}
                  </span>
                  <button
                    type="button"
                    onClick={() => setTab('rules')}
                    className="flex shrink-0 items-center gap-[5px] text-[10.5px] font-bold text-[#0A5C36] hover:underline"
                  >
                    {t('features.parish.viewRules', { defaultValue: 'Xem quy tắc điểm' })}
                    <ArrowRight className="size-[11px]" aria-hidden />
                  </button>
                </div>
              </>
            )}
          </section>
        </div>

        {/* Cột phụ 300px: quy tắc đang áp dụng + cách tính điểm */}
        <aside className="flex w-full shrink-0 flex-col gap-[16px] xl:w-[300px]">
          <section className={CARD}>
            <div className="flex w-full items-center justify-between px-4 py-[14px]">
              <p className="font-mono text-[9.5px] font-semibold uppercase tracking-[1.2px] text-[#8C9F94]">
                {t('features.parish.statActive', { defaultValue: 'Đang áp dụng' })}
              </p>
              <span
                className={cn('size-1.5 rounded-full', activeRule ? 'bg-[#12805A]' : 'bg-[#C3D2C7]')}
                aria-hidden
              />
            </div>
            <div className={RULE} aria-hidden />
            <div className="flex w-full flex-col gap-3 px-4 pb-4 pt-[14px]">
              <div className="flex items-end gap-2">
                <Star className="mb-1 size-[18px] text-[#C9A227]" aria-hidden />
                <span className="text-[34px] font-extrabold leading-[34px] tracking-[-1.2px] text-[#0B2E1F]">
                  {activeRule ? activeRule.points : '—'}
                </span>
                <span className="pb-1 text-[11px] text-[#8AA298]">
                  {t('features.parish.pointsPerTask', { defaultValue: 'điểm / task' })}
                </span>
              </div>
              <p className="w-full text-[12px] font-bold leading-[17px] text-[#0B2E1F]">
                {activeRule ? activeRule.name : t('features.parish.noActiveRule', { defaultValue: 'Chưa có quy tắc áp dụng' })}
              </p>
              <div className="flex w-full items-center justify-between border-t border-[#F0F4EC] pt-[9px]">
                <span className="text-[10.5px] text-[#96AAA0]">{t('features.parish.ruleEffectiveFrom')}</span>
                <span className="font-mono text-[10px] font-bold text-[#3B5348]">
                  {activeRule?.effectiveFrom ?? '—'}
                </span>
              </div>
              <div className="flex w-full items-center justify-between border-t border-[#F0F4EC] pt-[9px]">
                <span className="text-[10.5px] text-[#96AAA0]">{t('features.parish.ruleType')}</span>
                <span className="font-mono text-[10px] font-bold text-[#3B5348]">
                  {activeRule ? `${activeRule.contributionTypeCode} · v${activeRule.ruleVersion}` : '—'}
                </span>
              </div>
            </div>
          </section>

          <section className="relative flex w-full flex-col gap-2 overflow-hidden rounded-[14px] bg-[#0A5C36] px-[14px] py-[13px]">
            <div
              className="pointer-events-none absolute left-[180px] top-[-80px] z-0 size-[200px] rounded-full bg-[#E9B9492E] blur-[25px]"
              aria-hidden
            />
            <p className="relative z-[1] flex items-center gap-[7px]">
              <Info className="size-3 text-[#F2D07A]" aria-hidden />
              <span className="font-mono text-[9px] font-bold uppercase tracking-[1.1px] text-[#F2D07A]">
                {t('features.parish.howPoints', { defaultValue: 'Cách tính điểm' })}
              </span>
            </p>
            <p className="relative z-[2] w-full text-[10.5px] leading-[16px] text-[#A9D7BF]">
              {t('features.parish.howPointsBody', { defaultValue: 'Mỗi task hoàn thành được cộng số điểm của quy tắc đang áp dụng cho loại đóng góp tương ứng; quy tắc tạm dừng không cộng điểm.' })}
            </p>
          </section>
        </aside>
      </div>

      {ruleOpen && (
        <Dialog
          open
          onClose={() => setRuleOpen(false)}
          title={t('features.parish.addRule')}
          footer={
            <>
              <Button variant="outline" onClick={() => setRuleOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button
                disabled={!ruleName.trim() || !ruleTypeId || Number(rulePoints) <= 0 || createRule.isPending}
                onClick={submitRule}
              >
                {t('common.save')}
              </Button>
            </>
          }
        >
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="rule-type">{t('features.parish.ruleType')}</Label>
              <select
                id="rule-type"
                className={SELECT_CLS}
                value={ruleTypeId}
                onChange={(e) => setRuleTypeId(e.target.value)}
              >
                <option value="">{t('common.selectPlaceholder')}</option>
                {types
                  .filter((ct) => ct.status === 'ACTIVE')
                  .map((ct) => (
                    <option key={ct.id} value={ct.id}>
                      {ct.name} ({ct.code})
                    </option>
                  ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="rule-name">{t('features.parish.ruleName')}</Label>
              <Input
                id="rule-name"
                value={ruleName}
                maxLength={150}
                onChange={(e) => setRuleName(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="rule-points">{t('features.parish.rulePoints')}</Label>
                <Input
                  id="rule-points"
                  type="number"
                  min={1}
                  max={10000}
                  value={rulePoints}
                  onChange={(e) => setRulePoints(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="rule-from">{t('features.parish.ruleEffectiveFrom')}</Label>
                <Input
                  id="rule-from"
                  type="date"
                  value={ruleFrom}
                  onChange={(e) => setRuleFrom(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="rule-note">{t('features.parish.ruleDescription')}</Label>
              <textarea
                id="rule-note"
                rows={3}
                maxLength={2000}
                className={TEXTAREA_CLS}
                value={ruleNote}
                onChange={(e) => setRuleNote(e.target.value)}
              />
            </div>
          </div>
        </Dialog>
      )}

      {typeOpen && (
        <Dialog
          open
          onClose={() => setTypeOpen(false)}
          title={t('features.parish.addType')}
          footer={
            <>
              <Button variant="outline" onClick={() => setTypeOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button
                disabled={!typeCode.trim() || !typeName.trim() || createType.isPending}
                onClick={submitType}
              >
                {t('common.save')}
              </Button>
            </>
          }
        >
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="type-code">{t('features.parish.typeCode')}</Label>
              <Input
                id="type-code"
                value={typeCode}
                maxLength={50}
                onChange={(e) => setTypeCode(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="type-name">{t('features.parish.typeName')}</Label>
              <Input
                id="type-name"
                value={typeName}
                maxLength={100}
                onChange={(e) => setTypeName(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="type-note">{t('features.parish.ruleDescription')}</Label>
              <textarea
                id="type-note"
                rows={2}
                maxLength={2000}
                className={TEXTAREA_CLS}
                value={typeNote}
                onChange={(e) => setTypeNote(e.target.value)}
              />
            </div>
          </div>
        </Dialog>
      )}

      {deactivateTarget && (
        <Dialog
          open
          onClose={() => setDeactivateTarget(null)}
          title={t('features.parish.ruleDeactivate')}
          footer={
            <>
              <Button variant="outline" onClick={() => setDeactivateTarget(null)}>
                {t('common.cancel')}
              </Button>
              <Button
                disabled={!deactivateReason.trim() || deactivate.isPending}
                onClick={confirmDeactivate}
              >
                {t('features.parish.ruleDeactivate')}
              </Button>
            </>
          }
        >
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">{deactivateTarget.name}</p>
            <Label htmlFor="deactivate-reason">{t('features.parish.ruleDeactivateReason')}</Label>
            <textarea
              id="deactivate-reason"
              rows={3}
              maxLength={500}
              className={TEXTAREA_CLS}
              value={deactivateReason}
              onChange={(e) => setDeactivateReason(e.target.value)}
            />
          </div>
        </Dialog>
      )}
    </div>
  )
}
