// Editor danh sách tiêu chí sẵn sàng (tên + bắt buộc), dùng chung cho:
//   - AreaFormDialog: Ban hành giáo đặt tiêu chí NGAY khi tạo khu vực;
//   - ChecklistPage (CreateCheckDialog): tạo phiếu cho khu đã có sẵn.
// Không giữ state bên trong — component cha quyết định dữ liệu và validate.
import { useTranslation } from 'react-i18next'
import { Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export interface ReadinessItemDraft {
  name: string
  mandatory: boolean
}

export function ReadinessItemsEditor({
  items,
  onChange,
  idPrefix = 'readiness-item',
}: {
  items: ReadinessItemDraft[]
  onChange: (items: ReadinessItemDraft[]) => void
  /** Tiền tố id để nhãn `htmlFor` không trùng khi có nhiều editor trên trang. */
  idPrefix?: string
}) {
  const { t } = useTranslation()

  const update = (index: number, patch: Partial<ReadinessItemDraft>) =>
    onChange(items.map((item, i) => (i === index ? { ...item, ...patch } : item)))

  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-2">
          <Input
            id={`${idPrefix}-${index}`}
            aria-label={`${t('features.checklist.itemName')} ${index + 1}`}
            placeholder={t('features.checklist.itemName')}
            value={item.name}
            onChange={(e) => update(index, { name: e.target.value })}
          />
          <label className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={item.mandatory}
              onChange={(e) => update(index, { mandatory: e.target.checked })}
            />
            {t('features.checklist.mandatory')}
          </label>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={t('common.delete')}
            disabled={items.length === 1}
            onClick={() => onChange(items.filter((_, i) => i !== index))}
          >
            <X className="size-4" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => onChange([...items, { name: '', mandatory: true }])}
      >
        <Plus className="size-4" />
        {t('features.checklist.addItem')}
      </Button>
    </div>
  )
}
