// Helper định dạng dùng chung — ISO yyyy-mm-dd → dd/MM/yyyy.
export const viDate = (iso: string) =>
  iso.length >= 10 ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : iso

// Thời gian tương đối cho activity (dropdown thông báo): <1p "vừa xong",
// phút/giờ/ngày; cũ hơn 7 ngày hoặc mốc tương lai (seed 2026) → dd/MM/yyyy.
export function relTime(
  iso: string,
  t: (key: string, opts?: Record<string, unknown>) => string,
): string {
  const s = (Date.now() - new Date(iso).getTime()) / 1000
  if (s < 0 || s >= 7 * 86400) return viDate(iso)
  if (s < 60) return t('notifications.justNow')
  if (s < 3600) return t('notifications.minAgo', { n: Math.floor(s / 60) })
  if (s < 86400) return t('notifications.hourAgo', { n: Math.floor(s / 3600) })
  return t('notifications.dayAgo', { n: Math.floor(s / 86400) })
}
