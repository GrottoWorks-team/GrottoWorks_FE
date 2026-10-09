// Trang danh mục (route /parish/categories) — 4 tab theo plan:
//   • Loại khu vực (areaType): enum WorkArea.type — READ-ONLY + đếm khu theo loại.
//   • Kỹ năng (skill): db.skills — CRUD thật qua /api/skills; xoá bị mock chặn
//     409 khi còn user/task tham chiếu (đếm tham chiếu hiển thị trước nút xoá).
//   • Loại vật tư (unit): đơn vị tính — KHÔNG có model riêng trong seed/types;
//     lưu localStorage 'grotto-unit-catalog' dạng delta so với 13 unit mặc định.
//   • Loại đóng góp (donationKind): vật tư / tiền — READ-ONLY + đếm cam kết.
// Tab readonly: enum cố định trong types (compile-time) → không sửa được.
import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { Check, Pencil, Plus, Trash2, X } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/toast'
import { useAreas } from '@/features/areas/api'
import { useDonations } from '@/features/donations/api'
import { useMaterials } from '@/features/materials/api'
import { useTasks } from '@/features/tasks/api'
import { useUsers } from '@/features/users/api'
import { cn } from '@/lib/utils'
import { useAdminSkills, useCreateSkill, useDeleteSkill, useRenameSkill } from '../api'
import type { WorkArea } from '@/types'

const AREA_TYPES: WorkArea['type'][] = ['GROTTO', 'TREE', 'LIGHTING', 'YARD', 'STAGE']
const DONATION_KINDS = ['MATERIAL', 'MONETARY'] as const

// 13 đơn vị trong seed materials.ts — localStorage chỉ lưu delta (ẩn mặc định
// / thêm mới) để reset demo ('grotto-db-v1') không đụng danh mục này.
const DEFAULT_UNITS = [
  'bao', 'viên', 'bó', 'm', 'm2', 'cây', 'dây', 'kg', 'cuộn', 'cái', 'thùng', 'tấm', 'hộp',
]
const UNIT_KEY = 'grotto-unit-catalog'

type UnitsDelta = { removedDefaults: string[]; added: string[] }

// localStorage JSON parse hỏng → về delta rỗng (danh sách mặc định).
function loadUnits(): UnitsDelta {
  try {
    const raw = localStorage.getItem(UNIT_KEY)
    if (raw) {
      const v = JSON.parse(raw) as UnitsDelta
      if (Array.isArray(v?.removedDefaults) && Array.isArray(v?.added)) return v
    }
  } catch {
    // blob hỏng — bỏ qua, dùng mặc định
  }
  return { removedDefaults: [], added: [] }
}

// Danh sách hiện tại từ delta — thứ tự: mặc định (chưa ẩn) rồi thêm mới.
function applyUnits(d: UnitsDelta): string[] {
  return [...DEFAULT_UNITS.filter((u) => !d.removedDefaults.includes(u)), ...d.added]
}

const TABS = ['areaType', 'skill', 'unit', 'donationKind'] as const
type Tab = (typeof TABS)[number]

const schema = z.object({
  name: z.string().trim().min(1, 'features.parish.categoryNameRequired'),
})
type FormData = z.infer<typeof schema>

// Hàng danh mục: tên + số tham chiếu + sửa inline + xoá (chặn khi refCount > 0).
function CategoryRow({
  name,
  refCount,
  refLabel,
  onRename,
  onDelete,
}: {
  name: string
  refCount: number
  refLabel: string
  onRename?: (next: string) => void
  onDelete?: () => void
}) {
  const { t } = useTranslation()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(name)

  const commit = () => {
    setEditing(false)
    const v = draft.trim()
    if (v && v !== name) onRename?.(v)
  }

  return (
    <li className="flex items-center justify-between gap-3 border-b border-border/60 py-2.5 last:border-0">
      {editing ? (
        <form
          className="flex flex-1 gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            commit()
          }}
        >
          <Input
            value={draft}
            autoFocus
            aria-label={t('features.parish.categoryName')}
            onChange={(e) => setDraft(e.target.value)}
          />
          <Button type="submit" variant="ghost" size="icon" aria-label={t('common.confirm')}>
            <Check className="size-4 text-brand-pine" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={t('common.cancel')}
            onClick={() => setEditing(false)}
          >
            <X className="size-4" />
          </Button>
        </form>
      ) : (
        <>
          <span className="font-semibold text-foreground">{name}</span>
          <div className="flex items-center gap-1">
            <span className="lbl-mono !text-[11px]">
              {refCount} {refLabel}
            </span>
            {onRename && (
              <Button
                variant="ghost"
                size="icon"
                aria-label={t('common.edit')}
                onClick={() => {
                  setDraft(name)
                  setEditing(true)
                }}
              >
                <Pencil className="size-4" />
              </Button>
            )}
            {onDelete && (
              <Button variant="ghost" size="icon" aria-label={t('common.delete')} onClick={onDelete}>
                <Trash2 className="size-4" />
              </Button>
            )}
          </div>
        </>
      )}
    </li>
  )
}

// Form thêm nhanh: input + nút tạo — reset sau khi add (await để isSubmitting
// giữ nút disabled trong lúc mutation chạy).
function AddCategoryForm({ onAdd }: { onAdd: (name: string) => void | Promise<unknown> }) {
  const { t } = useTranslation()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema), defaultValues: { name: '' } })

  return (
    <form
      className="mt-4 flex items-start gap-2"
      onSubmit={handleSubmit(async (d) => {
        // onAdd trả promise thật (caller không discard) — reset chỉ khi thành công;
        // lỗi đã toast ở caller, giữ nguyên input để sửa lại.
        try {
          await onAdd(d.name.trim())
          reset()
        } catch {
          // bỏ qua — đã toast
        }
      })}
    >
      <div className="flex-1">
        <Label htmlFor="add-category" className="sr-only">
          {t('features.parish.categoryName')}
        </Label>
        <Input
          id="add-category"
          placeholder={t('features.parish.categoryAddPlaceholder')}
          {...register('name')}
        />
        {errors.name?.message && (
          <p className="mt-1 text-xs font-semibold text-destructive">{t(errors.name.message)}</p>
        )}
      </div>
      <Button type="submit" disabled={isSubmitting}>
        <Plus className="size-4" />
        {t('common.create')}
      </Button>
    </form>
  )
}

export default function CategoriesPage() {
  const { t } = useTranslation()
  const toast = useToast()
  const [tab, setTab] = useState<Tab>('skill')

  const { data: users = [] } = useUsers()
  const { data: tasks = [] } = useTasks()
  const { data: materials = [] } = useMaterials()
  const { data: areas = [] } = useAreas()
  const { data: donations = [] } = useDonations()
  const { data: skills = [] } = useAdminSkills()
  const createSkill = useCreateSkill()
  const renameSkill = useRenameSkill()
  const deleteSkill = useDeleteSkill()

  const [unitsDelta, setUnitsDelta] = useState<UnitsDelta>(loadUnits)
  const units = useMemo(() => applyUnits(unitsDelta), [unitsDelta])
  const saveUnits = (next: UnitsDelta) => {
    localStorage.setItem(UNIT_KEY, JSON.stringify(next))
    setUnitsDelta(next)
  }

  // Số tham chiếu: kỹ năng = user + task đang dùng; đơn vị = vật tư theo unit.
  const skillUses = (s: string) =>
    users.filter((u) => u.skills.includes(s)).length +
    tasks.filter((x) => x.skills.includes(s)).length
  const unitUses = (u: string) => materials.filter((m) => m.unit === u).length

  // Ném lỗi sau khi toast để form thêm không reset input khi create fail
  // (vd trùng tên) — caller await đúng flow.
  const addSkill = async (name: string) => {
    try {
      await createSkill.mutateAsync(name)
      toast(t('features.parish.created', { name }))
    } catch (e) {
      toast(e instanceof Error ? e.message : t('common.error'), 'alert')
      throw e
    }
  }
  const renameSkillAt = async (index: number, name: string) => {
    try {
      await renameSkill.mutateAsync({ index, name })
      toast(t('features.parish.updated', { name }))
    } catch (e) {
      toast(e instanceof Error ? e.message : t('common.error'), 'alert')
    }
  }
  const deleteSkillAt = async (index: number) => {
    try {
      await deleteSkill.mutateAsync(index)
      toast(t('features.parish.deleted', { name: skills[index] }))
    } catch (e) {
      // 409: mock trả "Kỹ năng … đang được dùng — không thể xoá" hiện nguyên văn.
      toast(e instanceof Error ? e.message : t('common.error'), 'alert')
    }
  }

  // Units — delta so với mặc định; đếm tham chiếu chặn xoá khi còn vật tư.
  const addUnit = (name: string) => {
    if (units.includes(name)) {
      toast(t('features.parish.categoryDuplicate', { name }), 'alert')
      return
    }
    saveUnits({ ...unitsDelta, added: [...unitsDelta.added, name] })
    toast(t('features.parish.created', { name }))
  }
  const renameUnitAt = (index: number, name: string) => {
    const current = [...units]
    const old = current[index]
    current[index] = name
    saveUnits({
      removedDefaults: DEFAULT_UNITS.filter((u) => !current.includes(u)),
      added: current.filter((u) => !DEFAULT_UNITS.includes(u)),
    })
    toast(t('features.parish.updated', { name: old }))
  }
  const deleteUnitAt = (index: number) => {
    const name = units[index]
    if (unitUses(name) > 0) {
      toast(t('features.parish.categoryInUse', { name }), 'alert')
      return
    }
    if (DEFAULT_UNITS.includes(name)) {
      saveUnits({ ...unitsDelta, removedDefaults: [...unitsDelta.removedDefaults, name] })
    } else {
      saveUnits({ ...unitsDelta, added: unitsDelta.added.filter((u) => u !== name) })
    }
    toast(t('features.parish.deleted', { name }))
  }

  return (
    <div>
      <PageHeader title={t('features.parish.categoriesTitle')} sub={t('features.parish.categoriesSub')} />

      <div
        className="mb-5 flex flex-wrap gap-1.5"
        role="tablist"
        aria-label={t('features.parish.categoriesTitle')}
      >
        {TABS.map((x) => (
          <button
            key={x}
            type="button"
            role="tab"
            aria-selected={tab === x}
            onClick={() => setTab(x)}
            className={cn(
              'rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors',
              tab === x
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-card text-muted-foreground hover:border-primary hover:text-primary',
            )}
          >
            {t(`features.parish.catTab.${x}`)}
          </button>
        ))}
      </div>

      <Card className="p-5">
        {tab === 'areaType' && (
          <>
            <p className="lbl-mono mb-2">{t('features.parish.catHint.areaType')}</p>
            <ul>
              {AREA_TYPES.map((x) => (
                <CategoryRow
                  key={x}
                  name={t(`features.areas.areaType.${x}`)}
                  refCount={areas.filter((a) => a.type === x).length}
                  refLabel={t('features.parish.refAreas')}
                />
              ))}
            </ul>
          </>
        )}

        {tab === 'skill' && (
          <>
            <ul>
              {skills.map((s, i) => (
                <CategoryRow
                  key={s}
                  name={s}
                  refCount={skillUses(s)}
                  refLabel={t('features.parish.refUses')}
                  onRename={(next) => void renameSkillAt(i, next)}
                  onDelete={() => void deleteSkillAt(i)}
                />
              ))}
            </ul>
            {!skills.length && <EmptyState text={t('features.parish.empty')} />}
            <AddCategoryForm onAdd={addSkill} />
          </>
        )}

        {tab === 'unit' && (
          <>
            <ul>
              {units.map((u, i) => (
                <CategoryRow
                  key={u}
                  name={u}
                  refCount={unitUses(u)}
                  refLabel={t('features.parish.refUses')}
                  onRename={(next) => renameUnitAt(i, next)}
                  onDelete={() => deleteUnitAt(i)}
                />
              ))}
            </ul>
            <AddCategoryForm onAdd={addUnit} />
          </>
        )}

        {tab === 'donationKind' && (
          <>
            <p className="lbl-mono mb-2">{t('features.parish.catHint.donationKind')}</p>
            <ul>
              {DONATION_KINDS.map((x) => (
                <CategoryRow
                  key={x}
                  name={t(`features.donations.kind.${x}`)}
                  refCount={donations.filter((d) => (x === 'MATERIAL' ? d.materialId : d.monetary)).length}
                  refLabel={t('features.parish.refUses')}
                />
              ))}
            </ul>
          </>
        )}
      </Card>
    </div>
  )
}
