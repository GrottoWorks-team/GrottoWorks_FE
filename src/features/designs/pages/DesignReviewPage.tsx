// Design Review — 2D (L2). Trang review bản vẽ/ảnh tham chiếu của một khu vực:
// xem ảnh (zoom/pan), gắn yêu cầu chỉnh sửa theo vị trí, lọc/danh sách, lịch sử
// phiên bản và duyệt phiên bản.
//
// Lưu ý phạm vi: đây là giai đoạn mock. File ảnh nằm trong IndexedDB của trình
// duyệt (chỉ máy này); metadata đi qua MSW. Phân quyền chỉ được kiểm ở UI —
// backend thật phải kiểm lại (xem docs/AI_LOG.md).
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  ArrowLeft,
  Boxes,
  CheckCircle2,
  FilePlus2,
  MapPin,
  Pencil,
  Plus,
  Trash2,
  Upload,
} from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { StatusTag } from '@/components/shared/StatusTag'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Card } from '@/components/ui/card'
import {
  buttonBase,
  buttonSizes,
  buttonVariants,
  Button,
} from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'
import { getBlob } from '@/lib/blobStore'
import { useAuth } from '@/lib/auth'
import { relTime } from '@/lib/format'
import { useArea, useAreas } from '@/features/areas/api'
import { useUsers } from '@/features/users/api'
import type { DesignComment } from '@/types'
import {
  useDeleteDesignComment,
  useDesignComments,
  useDesigns,
  useDesignVersions,
  useUpdateDesignComment,
  useUpdateDesignVersion,
} from '../api'
import { ImageReviewCanvas } from '../components/ImageReviewCanvas'
import type { CanvasMarker } from '../components/ImageReviewCanvas'
import { ModelReviewCanvas } from '../components/ModelReviewCanvas'
import type { ModelMarker } from '../components/ModelReviewCanvas'
import { ScenePreview } from '@/features/builder/components/ScenePreview'
import { isSceneFileKey } from '@/features/builder/designLink'
import { CommentFormDialog } from '../components/CommentFormDialog'
import { NewDesignDialog } from '../components/NewDesignDialog'
import { UploadVersionDialog } from '../components/UploadVersionDialog'
import type { ReviewPoint } from '../position'

const SELECT_CLS =
  'flex h-9 rounded-md border border-border bg-card px-2.5 text-xs font-semibold text-foreground transition-colors focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30'

const PRIORITY_TONE = {
  LOW: { tone: 'soft', glyph: '○' },
  MEDIUM: { tone: 'warn', glyph: '◐' },
  HIGH: { tone: 'alert', glyph: '✕' },
} as const

export default function DesignReviewPage() {
  const { t } = useTranslation()
  const toast = useToast()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { id: areaId = '' } = useParams()
  const { user } = useAuth()

  // Phân quyền chi tiết (chỉ kiểm ở UI — backend thật phải kiểm lại):
  // - LEADER: tạo hồ sơ thiết kế, tải phiên bản, gắn vị trí, duyệt/yêu cầu chỉnh sửa.
  // - PARISH (quản trị): chỉ xem + duyệt/yêu cầu chỉnh sửa, KHÔNG tạo/tải phiên bản.
  // - COMMUNITY (ban hành giáo): chỉ xem + bình luận.
  const canCreate = user?.role === 'LEADER'
  const canApprove = user?.role === 'LEADER' || user?.role === 'PARISH'
  const prefix = pathname.startsWith('/parish')
    ? '/parish'
    : pathname.startsWith('/leader')
      ? '/leader'
      : '/community'

  const { data: areaFromSingle } = useArea(areaId)
  const { data: areas = [] } = useAreas()
  const { data: usersFromApi = [] } = useUsers()
  // Chưa tải được danh sách user (thiếu quyền / lỗi mạng) → dùng chính user đang đăng nhập.
  const users = usersFromApi.length ? usersFromApi : user ? [user] : []
  const area = areaFromSingle ?? areas.find((a) => a.id === areaId)

  const { data: designs = [], isPending: designsPending } = useDesigns(areaId)
  const design = designs[0]
  // Loại hồ sơ quyết định canvas: ảnh 2D hay mô hình 3D (.glb).
  const is3d = design?.designType === 'THREE_D'
  const { data: versions = [] } = useDesignVersions(design?.id)

  const [pickedVersionId, setPickedVersionId] = useState<string | null>(null)
  const selectedVersion =
    versions.find((v) => v.id === pickedVersionId) ??
    versions.find((v) => v.id === design?.currentVersionId) ??
    versions[0]

  // Phiên bản được tạo bởi trình dựng 3D (fileKey `scene:*`) — nội dung là
  // scene trong SceneRepository, không phải blob .glb.
  const isSceneVersion = isSceneFileKey(selectedVersion?.fileKey)

  const { data: comments = [] } = useDesignComments(selectedVersion?.id)
  const updateVersion = useUpdateDesignVersion()
  const updateComment = useUpdateDesignComment()
  const deleteComment = useDeleteDesignComment()

  const [activeId, setActiveId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [addMode, setAddMode] = useState(false)
  const [pendingPoint, setPendingPoint] = useState<ReviewPoint | null>(null)
  const [commentDialog, setCommentDialog] = useState<
    { mode: 'new'; point?: ReviewPoint } | { mode: 'edit'; comment: DesignComment } | null
  >(null)
  const [deletingComment, setDeletingComment] = useState<DesignComment | null>(null)
  const [newDesignOpen, setNewDesignOpen] = useState(false)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [approving, setApproving] = useState(false)

  // ── Ảnh của phiên bản đang chọn: nạp blob → object URL, thu hồi khi đổi ──
  const [imageUrl, setImageUrl] = useState('')
  const [imageError, setImageError] = useState(false)
  const urlRef = useRef('')
  useEffect(() => {
    let cancelled = false
    setImageError(false)
    setImageUrl('')
    void (async () => {
      if (!selectedVersion || isSceneVersion) return
      const blob = await getBlob(selectedVersion.fileKey).catch(() => null)
      if (cancelled) return
      if (!blob) {
        setImageError(true)
        return
      }
      const url = URL.createObjectURL(blob)
      urlRef.current = url
      setImageUrl(url)
    })()
    return () => {
      cancelled = true
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current)
        urlRef.current = ''
      }
    }
  }, [selectedVersion])

  const sortedComments = useMemo(
    () => [...comments].sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [comments],
  )
  const numberById = useMemo(
    () => new Map(sortedComments.map((c, i) => [c.id, i + 1])),
    [sortedComments],
  )

  const markers = useMemo<CanvasMarker[]>(
    () =>
      comments
        .filter((c) => c.positionType === 'IMAGE_2D' && c.position2D)
        .map((c) => ({
          id: c.id,
          x: c.position2D!.x,
          y: c.position2D!.y,
          label: numberById.get(c.id) ?? 0,
          active: c.id === activeId,
        })),
    [comments, numberById, activeId],
  )

  const markers3D = useMemo<ModelMarker[]>(
    () =>
      comments
        .filter((c) => c.positionType === 'MODEL_3D' && c.position3D)
        .map((c) => ({
          id: c.id,
          x: c.position3D!.x,
          y: c.position3D!.y,
          z: c.position3D!.z,
          label: numberById.get(c.id) ?? 0,
          active: c.id === activeId,
        })),
    [comments, numberById, activeId],
  )

  const visibleComments = sortedComments.filter(
    (c) =>
      (statusFilter === 'all' || c.status === statusFilter) &&
      (priorityFilter === 'all' || c.priority === priorityFilter),
  )

  // Chọn marker ⇄ chọn dòng danh sách: cuộn dòng đang chọn vào tầm nhìn.
  useEffect(() => {
    if (!activeId) return
    document.getElementById(`design-comment-${activeId}`)?.scrollIntoView({ block: 'nearest' })
  }, [activeId])

  const nameOf = (id?: string) => users.find((u) => u.id === id)?.name ?? '—'
  const run = async (fn: () => Promise<unknown>, msg: string) => {
    try {
      await fn()
      toast(msg)
    } catch {
      toast(t('common.error'), 'alert')
    }
  }

  const approveVersion = () => {
    if (!selectedVersion || !user) return
    void run(
      () =>
        updateVersion.mutateAsync({
          id: selectedVersion.id,
          status: 'APPROVED',
          approvedBy: user.id,
          approvedAt: new Date().toISOString(),
        }),
      t('features.design.versionApproved'),
    )
  }

  const requestChanges = () => {
    if (!selectedVersion) return
    void run(
      () => updateVersion.mutateAsync({ id: selectedVersion.id, status: 'CHANGES_REQUESTED' }),
      t('features.design.changesRequested'),
    )
  }

  const toggleCommentStatus = (c: DesignComment) => {
    const next = c.status === 'RESOLVED' ? 'OPEN' : 'RESOLVED'
    void run(
      () =>
        updateComment.mutateAsync({
          id: c.id,
          status: next,
          updatedAt: new Date().toISOString(),
        }),
      next === 'RESOLVED' ? t('features.design.markedResolved') : t('features.design.reopened'),
    )
  }

  // LEADER không có route nhiệm vụ theo khu (khu của leader suy từ tài khoản),
  // nên quay về /leader/tasks; COMMUNITY/PARISH quay về trang nhiệm vụ của khu.
  const backToTasks = () =>
    navigate(pathname.startsWith('/leader') ? '/leader/tasks' : `${prefix}/areas/${areaId}/tasks`)

  if (designsPending) return <p className="lbl-mono">{t('common.loading')}</p>

  return (
    <div>
      <PageHeader
        title={area ? `${area.name} — ${t('features.design.title')}` : t('features.design.title')}
        sub={area ? `${t('features.design.sub')} · ${t(`features.areas.level.${area.level}`)}` : undefined}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={backToTasks}>
              <ArrowLeft className="size-4" />
              {t('common.back')}
            </Button>
            {canCreate && (
              <Link
                to={`${prefix}/areas/${areaId}/builder`}
                className={cn(buttonBase, buttonVariants.outline, buttonSizes.default)}
              >
                <Boxes className="size-4" />
                {t('builder.open')}
              </Link>
            )}
            {canCreate && selectedVersion && (
              <Button variant="outline" onClick={() => setUploadOpen(true)}>
                <Upload className="size-4" />
                {t('features.design.uploadVersion')}
              </Button>
            )}
          </div>
        }
      />

      {!design ? (
        <Card className="p-8 text-center">
          <EmptyState text={t('features.design.noDesign')} />
          {canCreate && (
            <Button className="mt-4" onClick={() => setNewDesignOpen(true)}>
              <FilePlus2 className="size-4" />
              {t('features.design.createDesign')}
            </Button>
          )}
        </Card>
      ) : !selectedVersion ? (
        <Card className="p-8 text-center">
          <EmptyState text={t('features.design.noVersion')} />
          {canCreate && (
            <Button className="mt-4" onClick={() => setUploadOpen(true)}>
              <Upload className="size-4" />
              {t('features.design.uploadVersion')}
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          {/* ── Khung xem 2D ─────────────────────────────────────────────── */}
          <div className="space-y-6">
            <Card className="p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-foreground">
                      {t('features.design.versionLabel', { n: selectedVersion.versionNumber })}
                    </span>
                    <StatusTag status={selectedVersion.status} />
                  </p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {selectedVersion.fileName} · {nameOf(selectedVersion.uploadedBy)} ·{' '}
                    {relTime(selectedVersion.uploadedAt, t)}
                  </p>
                  {selectedVersion.changeNote && (
                    <p className="mt-1 text-xs italic text-muted-foreground">
                      “{selectedVersion.changeNote}”
                    </p>
                  )}
                </div>
                {canApprove && (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={requestChanges}>
                      {t('features.design.requestChanges')}
                    </Button>
                    <Button size="sm" onClick={() => setApproving(true)}>
                      <CheckCircle2 className="size-4" />
                      {t('features.design.approveVersion')}
                    </Button>
                  </div>
                )}
              </div>

              {isSceneVersion ? (
                <ScenePreview
                  workAreaId={areaId}
                  builderHref={`${prefix}/areas/${areaId}/builder`}
                />
              ) : !imageUrl ? (
                <p className="grid h-[420px] place-items-center rounded-card border border-border bg-muted/30 px-6 text-center text-sm font-semibold text-muted-foreground sm:h-[520px]">
                  {imageError
                    ? is3d
                      ? t('features.design.modelMissing')
                      : t('features.design.storageMissing')
                    : t('common.loading')}
                </p>
              ) : is3d ? (
                <ModelReviewCanvas
                  src={imageUrl}
                  markers={markers3D}
                  addMode={addMode && canCreate}
                  onSelectMarker={setActiveId}
                  onAddMarker={(p) => {
                    setAddMode(false)
                    const rp: ReviewPoint = { type: 'MODEL_3D', point: p }
                    setPendingPoint(rp)
                    setCommentDialog({ mode: 'new', point: rp })
                  }}
                  onLoadError={() => setImageError(true)}
                />
              ) : (
                <ImageReviewCanvas
                  src={imageUrl}
                  markers={markers}
                  addMode={addMode && canCreate}
                  onSelectMarker={setActiveId}
                  onAddMarker={(p) => {
                    setAddMode(false)
                    const rp: ReviewPoint = { type: 'IMAGE_2D', point: p }
                    setPendingPoint(rp)
                    setCommentDialog({ mode: 'new', point: rp })
                  }}
                  onLoadError={() => setImageError(true)}
                />
              )}

              <p className="mt-3 text-xs text-muted-foreground">
                {isSceneVersion
                  ? t('builder.preview.hint')
                  : is3d
                    ? t('features.design.modelHint')
                    : t('features.design.canvasHint')}
              </p>
            </Card>

            {/* ── Lịch sử phiên bản ──────────────────────────────────────── */}
            <Card className="p-4">
              <p className="lbl-mono mb-3">{t('features.design.versionHistory')}</p>
              <ul className="space-y-2">
                {versions.map((v) => {
                  const active = v.id === selectedVersion.id
                  return (
                    <li key={v.id}>
                      <button
                        type="button"
                        onClick={() => setPickedVersionId(v.id)}
                        className={cn(
                          'flex w-full items-center justify-between gap-3 rounded-md border px-3 py-2 text-left transition-colors',
                          active
                            ? 'border-primary bg-brand-pineLight'
                            : 'border-border bg-card hover:border-primary/50',
                        )}
                      >
                        <span className="min-w-0">
                          <span className="block text-sm font-semibold text-foreground">
                            {t('features.design.versionLabel', { n: v.versionNumber })} · {v.fileName}
                          </span>
                          <span className="block text-xs text-muted-foreground">
                            {nameOf(v.uploadedBy)} · {relTime(v.uploadedAt, t)}
                          </span>
                        </span>
                        <StatusTag status={v.status} />
                      </button>
                    </li>
                  )
                })}
              </ul>
            </Card>
          </div>

          {/* ── Panel yêu cầu chỉnh sửa ─────────────────────────────────── */}
          <Card className="flex h-fit flex-col p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="lbl-mono">{t('features.design.commentsTitle')}</p>
              <span className="tabular text-xs font-semibold text-muted-foreground">
                {visibleComments.length}/{sortedComments.length}
              </span>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setPendingPoint(null)
                  setCommentDialog({ mode: 'new' })
                }}
              >
                <Plus className="size-4" />
                {t('features.design.addComment')}
              </Button>
              {canCreate && (
                <Button
                  size="sm"
                  variant={addMode ? 'default' : 'outline'}
                  onClick={() => setAddMode((v) => !v)}
                  disabled={isSceneVersion || imageError || !imageUrl}
                >
                  <MapPin className="size-4" />
                  {addMode ? t('features.design.clickOnImage') : t('features.design.attachPosition')}
                </Button>
              )}
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <select
                aria-label={t('common.status')}
                className={SELECT_CLS}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">{t('common.all')}</option>
                <option value="OPEN">{t('status.OPEN')}</option>
                <option value="IN_PROGRESS">{t('status.IN_PROGRESS')}</option>
                <option value="RESOLVED">{t('status.RESOLVED')}</option>
                <option value="REJECTED">{t('status.REJECTED')}</option>
              </select>
              <select
                aria-label={t('features.design.priorityLabel')}
                className={SELECT_CLS}
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
              >
                <option value="all">{t('common.all')}</option>
                <option value="LOW">{t('features.design.priority.LOW')}</option>
                <option value="MEDIUM">{t('features.design.priority.MEDIUM')}</option>
                <option value="HIGH">{t('features.design.priority.HIGH')}</option>
              </select>
            </div>

            <div className="mt-4 space-y-2">
              {visibleComments.length ? (
                visibleComments.map((c) => {
                  const active = c.id === activeId
                  return (
                    <div
                      key={c.id}
                      id={`design-comment-${c.id}`}
                      className={cn(
                        'rounded-md border p-3 transition-colors',
                        active ? 'border-primary bg-brand-pineLight/50' : 'border-border bg-card',
                      )}
                    >
                      <button
                        type="button"
                        className="w-full text-left"
                        onClick={() => setActiveId(c.id)}
                      >
                        <span className="flex items-start justify-between gap-2">
                          <span className="flex min-w-0 items-center gap-2">
                            <span className="grid size-5 shrink-0 place-items-center rounded-full bg-brand-pine font-mono text-[10px] font-bold text-white">
                              {numberById.get(c.id)}
                            </span>
                            <span className="truncate text-sm font-semibold text-foreground">
                              {c.title}
                            </span>
                          </span>
                          <StatusTag status={c.status} />
                        </span>
                        {c.description && (
                          <span className="mt-1 block text-xs text-muted-foreground">
                            {c.description}
                          </span>
                        )}
                        <span className="mt-2 flex flex-wrap items-center gap-2">
                          <StatusTag
                            status={c.priority}
                            tone={PRIORITY_TONE[c.priority].tone}
                            glyph={PRIORITY_TONE[c.priority].glyph}
                          />
                          {(c.positionType === 'IMAGE_2D' || c.positionType === 'MODEL_3D') && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-pine">
                              <MapPin className="size-3" />
                              {t('features.design.hasPosition')}
                            </span>
                          )}
                          {c.assignedTo && (
                            <span className="text-[11px] text-muted-foreground">
                              {t('features.design.assigneeShort', { name: nameOf(c.assignedTo) })}
                            </span>
                          )}
                          <span className="text-[11px] text-muted-foreground">
                            {relTime(c.createdAt, t)}
                          </span>
                        </span>
                      </button>

                      <div className="mt-2 flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleCommentStatus(c)}
                        >
                          {c.status === 'RESOLVED'
                            ? t('features.design.reopen')
                            : t('features.design.markResolved')}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={t('common.edit')}
                          onClick={() => setCommentDialog({ mode: 'edit', comment: c })}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={t('common.delete')}
                          onClick={() => setDeletingComment(c)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>
                  )
                })
              ) : (
                <EmptyState text={t('features.design.noComments')} />
              )}
            </div>
          </Card>
        </div>
      )}

      {newDesignOpen && user && (
        <NewDesignDialog
          areaId={areaId}
          createdBy={user.id}
          onCreated={() => setNewDesignOpen(false)}
          onClose={() => setNewDesignOpen(false)}
        />
      )}

      {uploadOpen && design && user && (
        <UploadVersionDialog
          designId={design.id}
          designType={design.designType}
          nextVersionNumber={(versions[0]?.versionNumber ?? 0) + 1}
          uploadedBy={user.id}
          onUploaded={setPickedVersionId}
          onClose={() => setUploadOpen(false)}
        />
      )}

      {commentDialog && selectedVersion && user && (
        <CommentFormDialog
          versionId={selectedVersion.id}
          comment={commentDialog.mode === 'edit' ? commentDialog.comment : null}
          point={commentDialog.mode === 'new' ? (commentDialog.point ?? pendingPoint) : null}
          createdBy={user.id}
          onClose={() => {
            setCommentDialog(null)
            setPendingPoint(null)
          }}
        />
      )}

      <ConfirmDialog
        open={Boolean(deletingComment)}
        title={t('features.design.deleteCommentTitle')}
        description={
          deletingComment
            ? t('features.design.deleteCommentConfirm', { name: deletingComment.title })
            : undefined
        }
        confirmLabel={t('common.delete')}
        tone="destructive"
        onConfirm={() => {
          if (!deletingComment) return
          void run(
            () => deleteComment.mutateAsync(deletingComment.id),
            t('features.design.commentDeleted'),
          )
          setDeletingComment(null)
        }}
        onClose={() => setDeletingComment(null)}
      />

      <ConfirmDialog
        open={approving}
        title={t('features.design.approveTitle')}
        description={
          selectedVersion
            ? t('features.design.approveConfirm', { n: selectedVersion.versionNumber })
            : undefined
        }
        confirmLabel={t('features.design.approveVersion')}
        onConfirm={approveVersion}
        onClose={() => setApproving(false)}
      />
    </div>
  )
}
