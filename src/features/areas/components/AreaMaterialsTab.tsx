// Tab Quản lý Nhu cầu vật tư (E1, E2, E3) và Bảng cảnh báo thiếu hụt (E4)
// Tích hợp trực tiếp trong AreaDetailDialog
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  AlertCircle,
  AlertTriangle,
  Ban,
  CheckCircle2,
  Package,
  Plus,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { useAuth } from '@/lib/auth'
import {
  useWorkAreaRequirements,
  useWorkAreaShortages,
  useUpdateMaterialRequirement,
  type MaterialRequirementDto,
} from '@/features/materials/api'
import { RequirementFormDialog } from './RequirementFormDialog'

interface AreaMaterialsTabProps {
  workAreaId: string
}

export function AreaMaterialsTab({ workAreaId }: AreaMaterialsTabProps) {
  const { t } = useTranslation()
  const toast = useToast()
  const { user } = useAuth()
  const isMaterialOfficer = user?.role === 'MATERIAL_OFFICER'

  const [activeSubTab, setActiveSubTab] = useState<'requirements' | 'shortages'>('requirements')
  const [createDialogOpen, setCreateDialogOpen] = useState(false)

  // E1: GET /api/v1/work-areas/{workAreaId}/material-requirements
  const {
    data: requirements = [],
    isPending: isReqPending,
    isError: isReqError,
    refetch: refetchReq,
  } = useWorkAreaRequirements(workAreaId)

  // E4: GET /api/v1/work-areas/{workAreaId}/shortages
  const {
    data: shortages = [],
    isPending: isShortPending,
    isError: isShortError,
    refetch: refetchShort,
  } = useWorkAreaShortages(workAreaId)

  // E3: PATCH /api/v1/material-requirements/{requirementId}
  const updateMutation = useUpdateMaterialRequirement()

  const onCancelRequirement = async (req: MaterialRequirementDto) => {
    if (
      !window.confirm(
        t('features.requirements.cancelConfirm', {
          name: `${req.materialName} (${req.materialCode})`,
        }),
      )
    ) {
      return
    }

    try {
      await updateMutation.mutateAsync({
        requirementId: req.id,
        workAreaId,
        version: req.version,
        status: 'CANCELLED',
      })
      toast(t('features.requirements.cancelledSuccess', { name: req.materialName }))
    } catch {
      toast(t('features.requirements.saveError'), 'alert')
    }
  }

  const positiveShortagesCount = shortages.filter((s) => s.shortage > 0).length

  return (
    <div className="space-y-4">
      {/* Sub Tabs: Requirements (E1) vs Shortages (E4) */}
      <div className="flex items-center justify-between border-b border-border pb-2">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setActiveSubTab('requirements')}
            className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
              activeSubTab === 'requirements'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
            }`}
          >
            <Package className="size-3.5" />
            {t('features.requirements.tabRequirements')}
            <span className="ml-1 rounded-full bg-background/20 px-1.5 py-0.2 text-[10px]">
              {requirements.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('shortages')}
            className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
              activeSubTab === 'shortages'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
            }`}
          >
            <AlertTriangle className={`size-3.5 ${positiveShortagesCount > 0 ? 'text-red-400' : ''}`} />
            {t('features.requirements.tabShortages')}
            {positiveShortagesCount > 0 && (
              <span className="ml-1 rounded-full bg-red-600 px-1.5 py-0.2 text-[10px] text-white">
                {positiveShortagesCount}
              </span>
            )}
          </button>
        </div>

        {/* E2: Nút thêm nhu cầu cho MO */}
        {isMaterialOfficer && activeSubTab === 'requirements' && (
          <Button
            size="sm"
            onClick={() => setCreateDialogOpen(true)}
            className="h-8 gap-1.5 bg-primary text-primary-foreground text-xs hover:bg-primary/90"
          >
            <Plus className="size-3.5" />
            {t('features.requirements.addBtn')}
          </Button>
        )}
      </div>

      {/* SUBTAB 1: REQUIREMENTS (E1, E2, E3) */}
      {activeSubTab === 'requirements' && (
        <div className="space-y-3">
          {isReqPending ? (
            <p className="lbl-mono py-8 text-center text-xs text-muted-foreground">
              {t('common.loading')}
            </p>
          ) : isReqError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-300">
              <AlertCircle className="mx-auto size-5 text-red-500 mb-1" />
              <p>{t('features.requirements.loadError')}</p>
              <Button variant="outline" size="sm" onClick={() => refetchReq()} className="mt-2 h-7 text-xs">
                {t('common.retry')}
              </Button>
            </div>
          ) : requirements.length === 0 ? (
            <p className="py-8 text-center text-xs text-muted-foreground">
              {t('features.requirements.empty')}
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border bg-card">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border bg-muted/40 font-semibold uppercase text-muted-foreground">
                  <tr>
                    <th scope="col" className="px-3 py-2.5">{t('features.requirements.colCode')}</th>
                    <th scope="col" className="px-3 py-2.5">{t('features.requirements.colName')}</th>
                    <th scope="col" className="px-3 py-2.5 text-center">{t('features.requirements.colUnit')}</th>
                    <th scope="col" className="px-3 py-2.5 text-right">{t('features.requirements.colRequired')}</th>
                    <th scope="col" className="px-3 py-2.5 text-right">{t('features.requirements.colExisting')}</th>
                    <th scope="col" className="px-3 py-2.5 text-center">{t('features.requirements.colStatus')}</th>
                    <th scope="col" className="px-3 py-2.5 text-center">{t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {requirements.map((req) => {
                    const isCancelled = req.status === 'CANCELLED'

                    return (
                      <tr
                        key={req.id}
                        className={`transition-colors hover:bg-muted/20 ${
                          isCancelled ? 'opacity-60 bg-muted/10' : ''
                        }`}
                      >
                        <td className="px-3 py-2 font-mono font-medium text-muted-foreground">
                          {req.materialCode}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex flex-col">
                            <span className="font-semibold text-foreground">{req.materialName}</span>
                            {req.note && (
                              <span className="text-[11px] text-muted-foreground line-clamp-1">
                                {req.note}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-center">
                          <span className="rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
                            {req.unit}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right tabular font-mono font-bold text-foreground">
                          {req.requiredQuantity}
                        </td>
                        <td className="px-3 py-2 text-right tabular font-mono text-muted-foreground">
                          {req.existingQuantity}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {isCancelled ? (
                            <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                              <Ban className="size-3" />
                              {t('features.requirements.statusCancelled')}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                              <CheckCircle2 className="size-3" />
                              {t('features.requirements.statusActive')}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {isMaterialOfficer && !isCancelled && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onCancelRequirement(req)}
                              disabled={updateMutation.isPending}
                              className="h-7 px-2 text-[11px] text-destructive hover:bg-destructive/10 hover:text-destructive"
                            >
                              <Ban className="size-3 mr-1" />
                              {t('features.requirements.cancelBtn')}
                            </Button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 2: SHORTAGES (E4) */}
      {activeSubTab === 'shortages' && (
        <div className="space-y-3">
          {positiveShortagesCount > 0 && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
              <AlertTriangle className="size-4 shrink-0 text-red-600 dark:text-red-400" />
              <span className="font-medium">
                {t('features.shortages.summaryCount', { count: positiveShortagesCount })}
              </span>
            </div>
          )}

          {isShortPending ? (
            <p className="lbl-mono py-8 text-center text-xs text-muted-foreground">
              {t('common.loading')}
            </p>
          ) : isShortError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-300">
              <AlertCircle className="mx-auto size-5 text-red-500 mb-1" />
              <p>{t('features.shortages.loadError')}</p>
              <Button variant="outline" size="sm" onClick={() => refetchShort()} className="mt-2 h-7 text-xs">
                {t('common.retry')}
              </Button>
            </div>
          ) : shortages.length === 0 ? (
            <p className="py-8 text-center text-xs text-muted-foreground">
              {t('features.shortages.empty')}
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border bg-card">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border bg-muted/40 font-semibold uppercase text-muted-foreground">
                  <tr>
                    <th scope="col" className="px-3 py-2.5">{t('features.requirements.colCode')}</th>
                    <th scope="col" className="px-3 py-2.5">{t('features.requirements.colName')}</th>
                    <th scope="col" className="px-3 py-2.5 text-center">{t('features.requirements.colUnit')}</th>
                    <th scope="col" className="px-3 py-2.5 text-right">{t('features.shortages.colRequired')}</th>
                    <th scope="col" className="px-3 py-2.5 text-right">{t('features.shortages.colAvailable')}</th>
                    <th scope="col" className="px-3 py-2.5 text-right">{t('features.shortages.colAllocated')}</th>
                    <th scope="col" className="px-3 py-2.5 text-center">{t('features.shortages.colShortage')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {shortages.map((s) => {
                    const isShortage = s.shortage > 0

                    return (
                      <tr
                        key={s.materialId}
                        className={`transition-colors hover:bg-muted/20 ${
                          isShortage ? 'bg-red-50/20 dark:bg-red-950/10' : ''
                        }`}
                      >
                        <td className="px-3 py-2 font-mono font-medium text-muted-foreground">
                          {s.materialCode}
                        </td>
                        <td className="px-3 py-2 font-semibold text-foreground">
                          {s.materialName}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <span className="rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
                            {s.unit}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right tabular font-mono text-foreground">
                          {s.required}
                        </td>
                        <td className="px-3 py-2 text-right tabular font-mono font-medium text-foreground">
                          {s.confirmedAvailable}
                        </td>
                        <td className="px-3 py-2 text-right tabular font-mono text-muted-foreground">
                          {s.allocated}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {isShortage ? (
                            <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-100/90 px-2 py-0.5 text-[11px] font-bold text-red-700 dark:border-red-800 dark:bg-red-950/60 dark:text-red-300">
                              <AlertTriangle className="size-3 text-red-600 dark:text-red-400" />
                              {t('features.shortages.badgeShortage', { count: s.shortage, unit: s.unit })}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                              <CheckCircle2 className="size-3 text-emerald-600 dark:text-emerald-400" />
                              {t('features.shortages.badgeSufficient')}
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* E2: Dialog thêm nhu cầu */}
      <RequirementFormDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        workAreaId={workAreaId}
      />
    </div>
  )
}
