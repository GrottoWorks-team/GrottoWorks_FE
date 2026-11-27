// Trang danh mục (route /parish/categories) — 4 tab theo plan:
//   • Hạng mục khu vực: `/api/v1/work-area-categories` (BE thật, có `WorkArea.categoryId`).
//   • Kỹ năng (skill): `/api/v1/skills` — tạo/sửa theo GUID; BE KHÔNG có DELETE.
//   • Loại vật tư (unit): BE chưa có danh mục đơn vị → lưu localStorage
//     'grotto-unit-catalog' dạng delta so với 13 unit mặc định (FE-only).
//   • Loại đóng góp (donationKind): READ-ONLY + đếm cam kết.
// Tab readonly: enum cố định trong types (compile-time) → không sửa được.
// Bố cục/số đo lấy đúng bản thiết kế Pen (KHOA.pen 27/11/2026): dải 3 thẻ số,
// cột danh sách + cột biểu mẫu 300px bên phải.
import { useMemo, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { Check, CircleCheck, Info, Layers, Pencil, Plus, Tags, Trash2, X } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatCard } from '@/components/shared/StatCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { useAreas } from '@/features/areas/api'
import { useDonations } from '@/features/donations/api'
import { useMaterials } from '@/features/materials/api'
import { useTasks } from '@/features/tasks/api'
import { useSkillsCatalog } from '@/features/skills/api'
import { useUsers } from '@/features/users/api'
import { useAuth } from '@/lib/auth'
import { cn } from '@/lib/utils'
import {
  useCreateSkill,
  useCreateWorkAreaCategory,
  useRenameSkill,
  useUpdateWorkAreaCategory,
  useWorkAreaCategories,
} from '../api'

const DONATION_KINDS = ['MATERIAL', 'MONETARY'] as const

// 13 đơn vị mặc định — localStorage chỉ lưu delta (ẩn mặc định
// / thêm mới) để reset demo không đụng danh mục này.
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

// Mảnh dùng lại: nút biểu tượng 26px trong hàng danh mục (Pen: Actions).
const ROW_BTN =
  'grid size-[26px] place-items-center rounded-[8px] text-[#8AA298] transition-colors hover:bg-[#F1F6EE] hover:text-[#0A5C36]'

// Hàng danh mục: chip biểu tượng + tên + số tham chiếu + sửa inline + xoá.
function CategoryRow({
  name,
  refCount,
  refLabel,
  onRename,
  onDelete,
}: {
  name: string
  /** `null` = không có quyền đọc số liệu tham chiếu (BE 403 với ADMIN). */
  refCount: number | null
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
    <li className="flex w-full items-center justify-between gap-3 border-b border-[#F0F4EC] px-[18px] py-[12px] last:border-0">
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
          <div className="flex min-w-0 items-center gap-[11px]">
            <span className="grid size-[30px] shrink-0 place-items-center rounded-[9px] border border-[#DDE8D6] bg-[#EDF4EA]">
              <Tags className="size-[13px] text-[#4F7A61]" aria-hidden />
            </span>
            <div className="flex min-w-0 flex-col gap-px">
              <span className="truncate text-[13px] font-bold text-[#0B2E1F]">{name}</span>
              <span className="truncate font-mono text-[9.5px] uppercase tracking-[1.2px] text-[#A3B4A9]">
                {refCount === null ? '—' : `${refCount} ${refLabel}`}
              </span>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-[2px]">
            {onRename && (
              <button
                type="button"
                className={ROW_BTN}
                aria-label={t('common.edit')}
                onClick={() => {
                  setDraft(name)
                  setEditing(true)
                }}
              >
                <Pencil className="size-3" aria-hidden />
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                className={ROW_BTN}
                aria-label={t('common.delete')}
                onClick={onDelete}
              >
                <Trash2 className="size-3" aria-hidden />
              </button>
            )}
          </div>
        </>
      )}
    </li>
  )
}

// Form thêm nhanh (cột phải) — reset sau khi add (await để isSubmitting giữ nút
// disabled trong lúc mutation chạy).
function AddCategoryForm({
  inputRef,
  onAdd,
}: {
  inputRef?: React.RefObject<HTMLInputElement | null>
  onAdd: (name: string) => void | Promise<unknown>
}) {
  const { t } = useTranslation()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema), defaultValues: { name: '' } })
  // ref của react-hook-form + ref ngoài (để nút "Tạo danh mục" trên header focus
  // vào ô nhập) — gộp bằng callback ref, không truyền 2 prop `ref`.
  const nameField = register('name')

  return (
    <form
      className="flex w-full flex-col gap-[10px] p-[14px_16px_16px]"
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
      <label className="text-[11px] font-semibold text-[#5C7468]" htmlFor="add-category">
        {t('features.parish.categoryName')}
      </label>
      <Input
        id="add-category"
        placeholder={t('features.parish.categoryAddPlaceholder')}
        className="h-[38px] rounded-[10px] border-[#DFE7DC] bg-[#FBFCFA] text-[11.5px]"
        {...nameField}
        ref={(el: HTMLInputElement | null) => {
          nameField.ref(el)
          if (inputRef) inputRef.current = el
        }}
      />
      {errors.name?.message && (
        <p className="text-[11px] font-semibold text-destructive">{t(errors.name.message)}</p>
      )}
      <button
        type="submit"
        disabled={isSubmitting}
        className="flex h-[38px] w-full items-center justify-center gap-[7px] rounded-[10px] bg-[#0A5C36] shadow-[0px_6px_14px_#0A5C3626] transition-colors hover:bg-[#0D7344] disabled:opacity-60"
      >
        <Plus className="size-[13px] text-white" aria-hidden />
        <span className="text-[12px] font-bold text-white">{t('common.create')}</span>
      </button>
      <p className="text-[10px] leading-[15px] text-[#A3B4A9]">{t('features.parish.categoryHelper')}</p>
    </form>
  )
}

export default function CategoriesPage() {
  const { t } = useTranslation()
  const toast = useToast()
  const [tab, setTab] = useState<Tab>('skill')
  const addInputRef = useRef<HTMLInputElement | null>(null)

  const { data: users = [] } = useUsers()
  const { data: tasks = [] } = useTasks()
  const { data: materials = [] } = useMaterials()
  const { data: areas = [] } = useAreas()
  // BE chỉ cho Parish/Leader/MO đọc `GET /donations`; tài khoản ADMIN (web
  // PARISH — trang này) gọi vào là 403. Vì vậy chỉ trang /community (role
  // COMMUNITY = BE PARISH) mới đếm số lượt dùng; trang admin hiện "—".
  const { user } = useAuth()
  const canCountDonations = user?.role === 'COMMUNITY'
  const { data: donations = [] } = useDonations({ enabled: canCountDonations })
  const { data: skillCatalog = [] } = useSkillsCatalog()
  const { data: areaCategories = [] } = useWorkAreaCategories()
  const createAreaCategory = useCreateWorkAreaCategory()
  const updateAreaCategory = useUpdateWorkAreaCategory()
  const createSkill = useCreateSkill()
  const renameSkill = useRenameSkill()

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
  const renameSkillAt = async (id: string, name: string) => {
    try {
      await renameSkill.mutateAsync({ id, name })
      toast(t('features.parish.updated', { name }))
    } catch (e) {
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

  const addAreaCategory = async (name: string) => {
    try {
      const code = name
        .toUpperCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^A-Z0-9]/g, '_')
        .slice(0, 16) || 'CAT'
      const finalCode = `${code}_${Math.floor(Math.random() * 899 + 100)}`
      await createAreaCategory.mutateAsync({ code: finalCode, name })
      toast(t('features.parish.created', { name }))
    } catch (e) {
      toast(e instanceof Error ? e.message : t('common.error'), 'alert')
      throw e
    }
  }

  const renameAreaCategory = async (id: string, name: string) => {
    try {
      await updateAreaCategory.mutateAsync({ id, name })
      toast(t('features.parish.updated', { name }))
    } catch (e) {
      toast(e instanceof Error ? e.message : t('common.error'), 'alert')
    }
  }

  // Số liệu cho dải thẻ đầu trang (bản thiết kế Pen 27/11/2026).
  const currentList: string[] =
    tab === 'areaType'
      ? areaCategories.map((c) => c.name)
      : tab === 'skill'
        ? skillCatalog.map((s) => s.name)
        : tab === 'unit'
          ? units
          : []
  const isUsed = (name: string) =>
    tab === 'areaType'
      ? areas.some((a) => areaCategories.find((c) => c.name === name)?.id === a.categoryId)
      : tab === 'skill'
        ? skillUses(name) > 0
        : tab === 'unit'
          ? unitUses(name) > 0
          : false
  const usedCount = currentList.filter(isUsed).length
  const tabLabel = t(`features.parish.catTab.${tab}`)
  const addHandler =
    tab === 'areaType' ? addAreaCategory : tab === 'skill' ? addSkill : tab === 'unit' ? addUnit : undefined

  return (
    <div className="flex flex-col gap-[16px]">
      <PageHeader
        title={t('features.parish.categoriesTitle')}
        sub={t('features.parish.categoriesSub')}
        actions={
          <button
            type="button"
            onClick={() => addInputRef.current?.focus()}
            className="flex h-[38px] items-center gap-[7px] rounded-[11px] bg-[#0A5C36] px-[13px] shadow-[0px_6px_14px_#0A5C362E] transition-colors hover:bg-[#0D7344]"
          >
            <Plus className="size-[14px] text-white" aria-hidden />
            <span className="text-[12px] font-bold text-white">{t('features.parish.createCategory')}</span>
          </button>
        }
      />

      <div className="flex w-full flex-wrap items-center justify-between gap-[16px]">
        <div
          className="flex w-fit flex-wrap gap-[4px] rounded-[12px] bg-[#EAF0E6] p-[4px]"
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
                'flex h-[32px] items-center justify-center rounded-[9px] px-[13px] text-[12px] transition-colors',
                tab === x
                  ? 'bg-white font-bold text-[#0A5C36] shadow-[0px_1px_3px_#06281B1A]'
                  : 'font-medium text-[#7C9287] hover:text-[#0B2E1F]',
              )}
            >
              {t(`features.parish.catTab.${x}`)}
            </button>
          ))}
        </div>
        <span className="flex w-fit items-center gap-[6px] rounded-full border border-[#E3EAE0] bg-white px-[10px] py-[5px]">
          <span className="text-[10.5px] font-semibold text-[#4F7A61]">
            {t('features.parish.itemCount', { n: currentList.length })}
          </span>
        </span>
      </div>

      <div className="grid gap-[14px] sm:grid-cols-3">
        <StatCard
          label={t('features.parish.totalItems')}
          value={currentList.length}
          hint={t('features.parish.totalSub', { tab: tabLabel })}
          icon={Tags}
        />
        <StatCard
          label={t('features.parish.groups')}
          value={TABS.length}
          hint={t('features.parish.groupsSub')}
          icon={Layers}
        />
        <StatCard
          label={t('features.parish.usesCount')}
          value={usedCount}
          tone="ok"
          hint={t('features.parish.usesSub', { n: usedCount })}
          icon={CircleCheck}
        />
      </div>

      <div className="flex w-full flex-col items-start gap-[16px] xl:flex-row">
        {/* Danh sách danh mục — một thẻ liền, đầu thẻ là nhãn + chip đếm */}
        <div className="flex w-full flex-1 flex-col overflow-hidden rounded-[16px] border border-[#E3EAE0] bg-white shadow-[0px_1px_2px_#06281B0A]">
          <div className="flex w-full items-center justify-between px-[18px] py-[14px]">
            <p className="font-mono text-[9.5px] font-semibold tracking-[1.2px] text-[#8C9F94]">
              {tabLabel}
            </p>
            <span className="flex items-center gap-[6px] rounded-full bg-[#F1F6EE] px-[9px] py-[4px]">
              <span className="text-[10px] font-bold text-[#4F7A61]">
                {t('features.parish.itemCount', { n: currentList.length })}
              </span>
            </span>
          </div>
          <div className="h-px w-full bg-[#ECF1E9]" aria-hidden />

          {tab === 'areaType' && (
            <ul className="w-full">
              {areaCategories.length > 0 ? (
                areaCategories.map((c) => (
                  <CategoryRow
                    key={c.id}
                    name={c.name}
                    refCount={areas.filter((a) => a.categoryId === c.id).length}
                    refLabel={t('features.parish.refAreas')}
                    onRename={(next) => void renameAreaCategory(c.id, next)}
                  />
                ))
              ) : (
                <li className="px-[20px] py-[20px] text-center text-[11px] text-[#A3B4A9]">
                  {t('features.parish.areaCategoriesEmpty', { defaultValue: 'Chưa có hạng mục khu vực nào.' })}
                </li>
              )}
            </ul>
          )}

          {tab === 'skill' && (
            <ul className="w-full">
              {skillCatalog.map((s) => (
                <CategoryRow
                  key={s.id}
                  name={s.name}
                  refCount={skillUses(s.name)}
                  refLabel={t('features.parish.refUses')}
                  onRename={(next) => void renameSkillAt(s.id, next)}
                />
              ))}
              {!skillCatalog.length && (
                <li className="flex flex-col items-center gap-[7px] px-[20px] py-[20px] text-center">
                  <Layers className="size-5 text-[#C3D2C7]" aria-hidden />
                  <span className="text-[11px] text-[#A3B4A9]">{t('features.parish.empty')}</span>
                </li>
              )}
            </ul>
          )}

          {tab === 'unit' && (
            <ul className="w-full">
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
          )}

          {tab === 'donationKind' && (
            <ul className="w-full">
              {DONATION_KINDS.map((x) => (
                <CategoryRow
                  key={x}
                  name={t(`features.donations.kind.${x}`)}
                  refCount={
                    canCountDonations
                      ? donations.filter((d) => (x === 'MATERIAL' ? d.type === 'MATERIAL' : d.type === 'MONEY')).length
                      : null
                  }
                  refLabel={t('features.parish.refUses')}
                />
              ))}
            </ul>
          )}

          {/* Lối tắt sang nhóm khác — thiết kế đặt ngay dưới danh sách */}
          <div className="flex w-fit flex-wrap gap-[6px] px-[18px] pb-[14px]">
            {TABS.filter((x) => x !== tab).map((x) => (
              <button
                key={x}
                type="button"
                onClick={() => setTab(x)}
                className="flex items-center gap-[5px] rounded-full border border-[#E3EAE0] bg-white px-[9px] py-[5px] text-[10px] font-semibold text-[#6B8175] transition-colors hover:border-[#CBE3D2] hover:text-[#0A5C36]"
              >
                {t(`features.parish.catTab.${x}`)}
              </button>
            ))}
          </div>
        </div>

        {/* Cột biểu mẫu 300px: thẻ thêm mới + thẻ ghi chú quyền */}
        <div className="flex w-full flex-col justify-between gap-[16px] xl:w-[300px] xl:shrink-0">
          {addHandler ? (
            <div className="flex w-full flex-col overflow-hidden rounded-[16px] border border-[#E3EAE0] bg-white shadow-[0px_1px_2px_#06281B0A]">
              <div className="flex items-center justify-between px-[16px] py-[14px]">
                <p className="font-mono text-[9.5px] font-semibold uppercase tracking-[1.2px] text-[#8C9F94]">
                  {t('features.parish.addNew', { name: tabLabel })}
                </p>
              </div>
              <div className="h-px w-full bg-[#ECF1E9]" aria-hidden />
              <AddCategoryForm inputRef={addInputRef} onAdd={addHandler} />
            </div>
          ) : (
            <div className="flex w-full flex-col overflow-hidden rounded-[16px] border border-[#E3EAE0] bg-white shadow-[0px_1px_2px_#06281B0A]">
              <div className="flex items-center justify-between px-[16px] py-[14px]">
                <p className="font-mono text-[9.5px] font-semibold uppercase tracking-[1.2px] text-[#8C9F94]">
                  {tabLabel}
                </p>
              </div>
              <div className="h-px w-full bg-[#ECF1E9]" aria-hidden />
              <p className="p-[14px_16px_16px] text-[11.5px] leading-[17px] text-[#5C7468]">
                {t(`features.parish.catHint.${tab}`, { defaultValue: t('features.parish.categoriesSub') })}
              </p>
            </div>
          )}

          <div className="relative flex w-full flex-col gap-[8px] overflow-hidden rounded-[14px] bg-[#0A5C36] p-[13px_14px]">
            <div
              className="pointer-events-none absolute left-[180px] top-[-80px] size-[200px] rounded-full bg-[#E9B9492E] blur-[25px]"
              aria-hidden
            />
            <p className="relative z-[1] flex items-center gap-[7px]">
              <Info className="size-3 shrink-0 text-[#F2D07A]" aria-hidden />
              <span className="font-mono text-[9px] font-semibold uppercase tracking-[1.2px] text-[#F2D07A]">
                {t(`role.${user?.role ?? 'PARISH'}`)}
              </span>
            </p>
            <p className="relative z-[1] text-[10.5px] leading-[16px] text-[#A9D7BF]">
              {t(`shell.roleNote.${user?.role ?? 'PARISH'}`)}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
