// WinterBackdrop — ảnh nền mùa đông cho trang Login.
// Dùng bản @2x (2752×1536, WebP) — được resample 2× + làm nét từ
// public/pic/Login_background.png — để đủ nét trên màn hình lớn; bản PNG gốc
// (1376×768) vẫn giữ nguyên trong repo.
// Tuyết rơi động do <Snowfall /> đè lên trên.
export function WinterBackdrop({ zoom = 1.18 }: { zoom?: number }) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-brand-pineLight"
    >
      {/* zoom > 1 để khung hình "lại gần" hơn: bớt trời/đất trống, làng và núi to rõ hơn.
          object-cover + overflow-hidden của khung cha lo phần cắt. */}
      <img
        src="/pic/Login_background@2x.webp"
        alt=""
        draggable={false}
        style={{ transform: `scale(${zoom})` }}
        className="h-full w-full select-none object-cover object-center"
      />
      {/* Vignette tối rất nhẹ ở đáy: tạo chiều sâu mà KHÔNG làm bạc màu ảnh như lớp
          phủ trắng trước đây. */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-primary/15" />
    </div>
  )
}
