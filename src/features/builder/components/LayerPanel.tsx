// Panel lớp thi công + danh sách item của lớp đang chọn + liên kết nhiệm vụ.
//
// Khóa lớp ở đây chỉ là UI; logic chặn thật nằm ở `scene.ts`
// (`updateItemTransform/removeItem/duplicateItem` trả nguyên scene khi khóa).
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ChevronDown, ChevronUp, CircleAlert, Eye, EyeOff, Layers, Link2, Lock,
  Plus, Trash2, Unlock,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { StatusTag } from '@/components/shared/StatusTag'
import { cn } from '@/lib/utils'
import { viDate } from '@/lib/format'
import type { Task } from '@/types'
import { itemsOfLayer, sortedLayers } from '../scene'
import type { ConstructionScene } from '../types'

const ICON_BTN =
  'grid size-7 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-background hover:text-foreground disabled:opacity-40'

export function LayerPanel({
  scene,
  activeLayerId,
  selectedItemId,
  onSelectLayer,
  onSelectItem,
  onAddLayer,
  onRenameLayer,
  onMoveLayer,
  onToggleVisible,
  onToggleLocked,
  onDeleteLayer,
  tasks,
  tasksPending,
  tasksError,
  tasksNotFound,
  onLinkTask,
  onUnlinkTask,
}: {
  scene: ConstructionScene
  activeLayerId: string | null
  selectedItemId: string | null
  onSelectLayer: (layerId: string) => void
  onSelectItem: (itemId: string) => void
  onAddLayer: (name: string) => void
  onRenameLayer: (layerId: string, name: string) => void
  onMoveLayer: (layerId: string, delta: -1 | 1) => void
  onToggleVisible: (layerId: string, visible: boolean) => void
  onToggleLocked: (layerId: string, locked: boolean) => void
  onDeleteLayer: (layerId: string) => void
  tasks?: Task[]
  tasksPending?: boolean
  tasksError?: boolean
  /** 404 = khu vực chưa được đồng bộ sang TaskExecution (scope chưa có). */
  tasksNotFound?: boolean
  onLinkTask: (layerId: string, taskId: string) => void
  onUnlinkTask: (layerId: string, taskId: string) => void
}) {
  const { t } = useTranslation()
  const layers = sortedLayers(scene)
  const active = layers.find((l) => l.id === activeLayerId) ?? null
  const activeItems = active ? itemsOfLayer(scene, active.id) : []
  const [newLayerName, setNewLayerName] = useState('')

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-y-auto">
      {/* Danh sách lớp */}
      <section className="rounded-card border border-border bg-card">
        <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
          <Layers className="size-4 text-primary" aria-hidden />
          <p className="lbl-mono flex-1">{t('builder.layers')}</p>
          <span className="text-[11px] text-muted-foreground">{layers.length}</span>
        </div>
        <ul className="p-1.5">
          {layers.map((layer, index) => {
            const items = itemsOfLayer(scene, layer.id)
            const isActive = layer.id === activeLayerId
            return (
              <li key={layer.id}>
                <div
                  className={cn(
                    'flex items-center gap-1 rounded-md px-1.5 py-1',
                    isActive ? 'bg-brand-pineLight' : 'hover:bg-background',
                  )}
                >
                  <button
                    type="button"
                    onClick={() => onSelectLayer(layer.id)}
                    aria-pressed={isActive}
                    className="min-w-0 flex-1 truncate text-left text-xs font-semibold text-foreground"
                    title={layer.name}
                  >
                    {layer.name}
                    <span className="ml-1 text-[10px] font-normal text-muted-foreground">
                      ({items.length})
                    </span>
                  </button>
                  <button
                    type="button"
                    className={ICON_BTN}
                    aria-label={t('builder.moveUp')}
                    disabled={index === 0}
                    onClick={() => onMoveLayer(layer.id, -1)}
                  >
                    <ChevronUp className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    className={ICON_BTN}
                    aria-label={t('builder.moveDown')}
                    disabled={index === layers.length - 1}
                    onClick={() => onMoveLayer(layer.id, 1)}
                  >
                    <ChevronDown className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    className={ICON_BTN}
                    aria-label={layer.visible ? t('builder.hide') : t('builder.show')}
                    aria-pressed={!layer.visible}
                    onClick={() => onToggleVisible(layer.id, !layer.visible)}
                  >
                    {layer.visible ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
                  </button>
                  <button
                    type="button"
                    className={cn(ICON_BTN, layer.locked && 'text-status-dangerText')}
                    aria-label={layer.locked ? t('builder.unlock') : t('builder.lock')}
                    aria-pressed={layer.locked}
                    onClick={() => onToggleLocked(layer.id, !layer.locked)}
                  >
                    {layer.locked ? <Lock className="size-3.5" /> : <Unlock className="size-3.5" />}
                  </button>
                  <button
                    type="button"
                    className={ICON_BTN}
                    aria-label={t('builder.deleteLayer')}
                    disabled={items.length > 0 || layers.length <= 1}
                    title={items.length > 0 ? t('builder.layerNotEmpty') : undefined}
                    onClick={() => onDeleteLayer(layer.id)}
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
        <form
          className="flex items-center gap-1.5 border-t border-border p-1.5"
          onSubmit={(event) => {
            event.preventDefault()
            if (!newLayerName.trim()) return
            onAddLayer(newLayerName.trim())
            setNewLayerName('')
          }}
        >
          <input
            value={newLayerName}
            onChange={(event) => setNewLayerName(event.target.value)}
            placeholder={t('builder.newLayerPlaceholder')}
            aria-label={t('builder.newLayer')}
            className="h-8 min-w-0 flex-1 rounded-md border border-border bg-background px-2 text-xs text-foreground focus-visible:border-primary focus-visible:outline-none"
          />
          <Button type="submit" size="sm" variant="secondary" disabled={!newLayerName.trim()}>
            <Plus aria-hidden />
            {t('common.create')}
          </Button>
        </form>
      </section>

      {/* Lớp đang chọn */}
      {active && (
        <section className="rounded-card border border-border bg-card">
          <div className="border-b border-border px-3 py-2.5">
            <p className="lbl-mono mb-1.5">{t('builder.activeLayer')}</p>
            <input
              value={active.name}
              onChange={(event) => onRenameLayer(active.id, event.target.value)}
              aria-label={t('builder.layerName')}
              className="h-8 w-full rounded-md border border-border bg-background px-2 text-sm font-semibold text-foreground focus-visible:border-primary focus-visible:outline-none"
            />
            {active.locked && (
              <p className="mt-1.5 flex items-center gap-1 text-[11px] text-status-dangerText">
                <Lock className="size-3" aria-hidden />
                {t('builder.lockedHint')}
              </p>
            )}
          </div>

          <div className="px-3 py-2">
            <p className="lbl-mono mb-1.5">{t('builder.itemsInLayer')}</p>
            {activeItems.length === 0 ? (
              <p className="text-xs text-muted-foreground">{t('builder.noItems')}</p>
            ) : (
              <ul className="space-y-1">
                {activeItems.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => onSelectItem(item.id)}
                      aria-pressed={item.id === selectedItemId}
                      className={cn(
                        'flex w-full items-center justify-between gap-2 rounded-md px-2 py-1 text-left text-xs transition-colors',
                        item.id === selectedItemId
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-background',
                      )}
                    >
                      <span className="truncate font-mono">{item.id}</span>
                      <span className="shrink-0 opacity-70">{item.assetId}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Liên kết nhiệm vụ */}
          <div className="border-t border-border px-3 py-2">
            <p className="lbl-mono mb-1.5 flex items-center gap-1">
              <Link2 className="size-3.5" aria-hidden />
              {t('builder.linkedTasks')}
            </p>

            {tasksError ? (
              <p className="flex items-start gap-1 text-[11px] text-status-dangerText">
                <CircleAlert className="mt-px size-3 shrink-0" aria-hidden />
                {tasksNotFound ? t('builder.tasksNotFound') : t('builder.tasksError')}
              </p>
            ) : tasksPending ? (
              <p className="text-xs text-muted-foreground">{t('common.loading')}</p>
            ) : !tasks || tasks.length === 0 ? (
              <p className="text-xs text-muted-foreground">{t('builder.noTasks')}</p>
            ) : (
              <ul className="space-y-1">
                {tasks.map((task) => {
                  const linked = active.taskIds.includes(task.id)
                  return (
                    <li key={task.id} className="rounded-md border border-border/70 p-1.5">
                      <label className="flex items-start gap-2">
                        <input
                          type="checkbox"
                          checked={linked}
                          onChange={() =>
                            linked
                              ? onUnlinkTask(active.id, task.id)
                              : onLinkTask(active.id, task.id)
                          }
                          className="mt-0.5 size-3.5 accent-brand-pine"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-xs font-semibold text-foreground">
                            {task.title}
                          </span>
                          <span className="mt-1 flex flex-wrap items-center gap-1.5">
                            <StatusTag status={task.status} />
                            {task.priority && (
                              <span className="text-[10px] text-muted-foreground">
                                {t('builder.priority')}:{' '}
                                {t(`priority.${task.priority}`, { defaultValue: task.priority })}
                              </span>
                            )}
                            {task.dueDate && (
                              <span className="text-[10px] text-muted-foreground">
                                {t('builder.deadline')}: {viDate(task.dueDate)}
                              </span>
                            )}
                          </span>
                        </span>
                      </label>
                    </li>
                  )
                })}
              </ul>
            )}

            <p className="mt-2 text-[10px] leading-snug text-muted-foreground">
              {t('builder.taskFieldsNote')}
            </p>
          </div>
        </section>
      )}
    </div>
  )
}
