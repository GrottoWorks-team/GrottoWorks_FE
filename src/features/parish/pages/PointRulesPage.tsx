// Trang vinh danh (route /parish/point-rules): quản lý THẬT qua Reporting service
//   • Loại đóng góp : GET/POST /api/v1/contribution-types, PATCH /{id}
//   • Quy tắc điểm  : GET/POST /api/v1/recognition-rules, POST /{id}/deactivate
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, Star } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable } from '@/components/shared/DataTable'
import { StatusTag } from '@/components/shared/StatusTag'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/toast'
import { ApiError } from '@/lib/api'
import { cn } from '@/lib/utils'
import {
  useContributionTypes,
  useCreateContributionType,
  useCreateRecognitionRule,
  useDeactivateRecognitionRule,
  useRecognitionRules,
  useUpdateContributionType,
  type ContributionTypeDto,
  type RecognitionRuleDto,
} from '@/features/recognition/api'

type Tab = 'rules' | 'types'

const TEXTAREA_CLS =
  'mt-1 w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground transition-colors focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30'

const SELECT_CLS =
  'h-10 w-full rounded-md border border-border bg-card px-3 text-sm text-foreground transition-colors focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30'

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

  const ruleColumns = [
    {
      key: 'name',
      header: t('features.parish.ruleName'),
      render: (r: RecognitionRuleDto) => (
        <div>
          <p className="font-semibold text-foreground">{r.name}</p>
          <p className="text-xs text-muted-foreground">
            {r.contributionTypeCode} · v{r.ruleVersion}
          </p>
        </div>
      ),
    },
    {
      key: 'points',
      header: t('features.parish.rulePoints'),
      align: 'right' as const,
      render: (r: RecognitionRuleDto) => (
        <span className="tabular inline-flex items-center gap-1 font-semibold">
          <Star className="size-3.5 text-brand-gold" aria-hidden />
          {r.points}
        </span>
      ),
    },
    {
      key: 'effectiveFrom',
      header: t('features.parish.ruleEffectiveFrom'),
      align: 'right' as const,
      render: (r: RecognitionRuleDto) => <span className="tabular">{r.effectiveFrom}</span>,
    },
    {
      key: 'status',
      header: t('common.status'),
      render: (r: RecognitionRuleDto) => <StatusTag status={r.status} />,
    },
    {
      key: 'actions',
      header: t('common.actions'),
      align: 'right' as const,
      render: (r: RecognitionRuleDto) =>
        r.status === 'ACTIVE' ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setDeactivateReason('')
              setDeactivateTarget(r)
            }}
          >
            {t('features.parish.ruleDeactivate')}
          </Button>
        ) : (
          '—'
        ),
    },
  ]

  const typeColumns = [
    {
      key: 'code',
      header: t('features.parish.typeCode'),
      render: (ct: ContributionTypeDto) => <span className="font-mono text-xs">{ct.code}</span>,
    },
    {
      key: 'name',
      header: t('features.parish.typeName'),
      render: (ct: ContributionTypeDto) => <span className="font-semibold">{ct.name}</span>,
    },
    {
      key: 'status',
      header: t('common.status'),
      render: (ct: ContributionTypeDto) => <StatusTag status={ct.status} />,
    },
    {
      key: 'actions',
      header: t('common.actions'),
      align: 'right' as const,
      render: (ct: ContributionTypeDto) => (
        <Button
          size="sm"
          variant="outline"
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
        >
          {ct.status === 'ACTIVE'
            ? t('features.parish.typeDeactivate')
            : t('features.parish.typeActivate')}
        </Button>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title={t('features.parish.rulesTitle')}
        sub={t('features.parish.rulesSub')}
        actions={
          <Button onClick={() => (tab === 'rules' ? setRuleOpen(true) : setTypeOpen(true))}>
            <Plus className="size-4" />
            {tab === 'rules' ? t('features.parish.addRule') : t('features.parish.addType')}
          </Button>
        }
      />

      <div className="mb-4 flex gap-1 rounded-full border border-border bg-card p-1">
        {(['rules', 'types'] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            aria-pressed={tab === value}
            className={cn(
              'rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors',
              tab === value
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {value === 'rules' ? t('features.parish.tabRules') : t('features.parish.tabTypes')}
          </button>
        ))}
      </div>

      <Card className="p-5">
        {tab === 'rules' ? (
          <DataTable
            rows={rules}
            columns={ruleColumns}
            pageSize={10}
            emptyText={
              rulesQuery.isPending ? t('common.loading') : t('features.parish.rulesEmpty')
            }
          />
        ) : (
          <DataTable
            rows={types}
            columns={typeColumns}
            pageSize={10}
            emptyText={
              typesQuery.isPending ? t('common.loading') : t('features.parish.typesEmpty')
            }
          />
        )}
      </Card>

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
