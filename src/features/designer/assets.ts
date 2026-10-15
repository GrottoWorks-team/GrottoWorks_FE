import type { GrottoAssetCategory, GrottoAssetDef } from './types'

export const GROTTO_ASSETS: GrottoAssetDef[] = [
  // ── 1. ROCKS (4 cấu kiện Vách & Vòm đá) ───────────────────────────────────
  {
    assetId: 'rock-arch-main',
    name: 'Vòm đá chính Bê-lem',
    category: 'ROCKS',
    defaultWidth: 320,
    defaultHeight: 220,
    svgMarkup: `<svg viewBox="0 0 320 220" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="rock-grad-1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#475569" />
          <stop offset="50%" stop-color="#334155" />
          <stop offset="100%" stop-color="#1e293b" />
        </linearGradient>
        <linearGradient id="cave-inner" x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stop-color="#0f172a" stop-opacity="0.95" />
          <stop offset="100%" stop-color="#1e293b" stop-opacity="0.8" />
        </linearGradient>
      </defs>
      <!-- Vòm ngoài gồ ghề -->
      <path d="M 20 210 Q 10 130 50 70 Q 110 15 160 10 Q 220 15 270 70 Q 310 130 300 210 Z" fill="url(#rock-grad-1)" stroke="#64748b" stroke-width="4" />
      <!-- Lòng hang rỗng tối màu -->
      <path d="M 55 210 Q 60 110 100 70 Q 160 40 220 70 Q 260 110 265 210 Z" fill="url(#cave-inner)" />
      <!-- Chi tiết thạch nhũ & rêu phong -->
      <path d="M 120 70 L 130 95 L 140 70 L 170 75 L 180 105 L 190 75" stroke="#94a3b8" stroke-width="3" stroke-linecap="round" fill="none" />
      <path d="M 40 180 Q 70 160 90 200" stroke="#059669" stroke-width="3" fill="none" />
      <path d="M 230 200 Q 250 160 280 180" stroke="#059669" stroke-width="3" fill="none" />
    </svg>`,
    materialReq: {
      materialName: 'Khung sắt hộp & Bạt xi măng tạo vách',
      defaultQty: 10,
      unit: 'cây',
      specs: 'Sắt hộp mạ kẽm 25x25mm kèm 3 cuộn bạt xi măng giả đá',
    },
  },
  {
    assetId: 'rock-wall-left',
    name: 'Vách đá tả ngạn',
    category: 'ROCKS',
    defaultWidth: 160,
    defaultHeight: 200,
    svgMarkup: `<svg viewBox="0 0 160 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M 10 200 L 20 120 L 5 80 L 40 40 L 90 10 L 150 60 L 140 200 Z" fill="#334155" stroke="#64748b" stroke-width="3" />
      <path d="M 30 110 L 80 80 L 120 130" stroke="#475569" stroke-width="2" fill="none" />
      <path d="M 15 170 Q 40 140 60 190" stroke="#10b981" stroke-width="3" fill="none" />
    </svg>`,
    materialReq: {
      materialName: 'Tre nứa & Bạt xi măng ốp vách',
      defaultQty: 5,
      unit: 'cây',
    },
  },
  {
    assetId: 'rock-wall-right',
    name: 'Vách đá hữu ngạn',
    category: 'ROCKS',
    defaultWidth: 160,
    defaultHeight: 200,
    svgMarkup: `<svg viewBox="0 0 160 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M 10 200 L 20 60 L 70 10 L 120 40 L 155 80 L 140 120 L 150 200 Z" fill="#334155" stroke="#64748b" stroke-width="3" />
      <path d="M 40 130 L 80 80 L 130 110" stroke="#475569" stroke-width="2" fill="none" />
      <path d="M 100 190 Q 120 140 145 170" stroke="#10b981" stroke-width="3" fill="none" />
    </svg>`,
    materialReq: {
      materialName: 'Tre nứa & Bạt xi măng ốp vách',
      defaultQty: 5,
      unit: 'cây',
    },
  },
  {
    assetId: 'rock-platform-manger',
    name: 'Bệ đá kê máng cỏ',
    category: 'ROCKS',
    defaultWidth: 140,
    defaultHeight: 70,
    svgMarkup: `<svg viewBox="0 0 140 70" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="70" cy="30" rx="60" ry="20" fill="#64748b" stroke="#94a3b8" stroke-width="3" />
      <path d="M 10 30 L 15 60 Q 70 75 125 60 L 130 30" fill="#475569" stroke="#94a3b8" stroke-width="3" />
    </svg>`,
    materialReq: {
      materialName: 'Bục gỗ kê máng cỏ',
      defaultQty: 1,
      unit: 'chiếc',
    },
  },

  // ── 2. STATUES (5 cấu kiện Tượng ảnh & Nhân vật) ──────────────────────────
  {
    assetId: 'statue-nativity-core',
    name: 'Tượng Thánh Gia & Máng cỏ',
    category: 'STATUES',
    defaultWidth: 120,
    defaultHeight: 110,
    svgMarkup: `<svg viewBox="0 0 120 110" fill="none" xmlns="http://www.w3.org/2000/svg">
      <!-- Máng cỏ trung tâm -->
      <path d="M 40 85 L 80 85 L 88 102 L 32 102 Z" fill="#78350f" stroke="#b45309" stroke-width="2" />
      <path d="M 35 85 Q 60 70 85 85" stroke="#fef08a" stroke-width="4" stroke-linecap="round" fill="none" />
      <!-- Hài Nhi -->
      <circle cx="60" cy="74" r="7" fill="#fde047" stroke="#ca8a04" stroke-width="1.5" />
      <ellipse cx="60" cy="84" rx="10" ry="6" fill="#fef9c3" />
      <!-- Mẹ Maria bên trái (quỳ cầu nguyện) -->
      <path d="M 22 55 Q 32 45 40 60 Q 42 95 20 95 Z" fill="#2563eb" opacity="0.9" />
      <circle cx="32" cy="46" r="6" fill="#fed7aa" />
      <!-- Thánh Giuse bên phải (cầm gậy đèn) -->
      <path d="M 78 50 Q 88 40 98 55 Q 100 95 80 95 Z" fill="#92400e" opacity="0.9" />
      <circle cx="88" cy="40" r="7" fill="#fed7aa" />
      <line x1="102" y1="35" x2="102" y2="95" stroke="#d97706" stroke-width="2" stroke-linecap="round" />
    </svg>`,
    materialReq: {
      materialName: 'Bộ Tượng Composite Thánh Gia 80cm',
      defaultQty: 1,
      unit: 'bộ',
      specs: 'Gồm Chúa Hài Đồng, Máng cỏ rơm, Đức Mẹ và Thánh Giuse',
    },
  },
  {
    assetId: 'statue-angel-gloria',
    name: 'Thiên Thần Gloria',
    category: 'STATUES',
    defaultWidth: 90,
    defaultHeight: 80,
    svgMarkup: `<svg viewBox="0 0 90 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <!-- Cánh trắng -->
      <path d="M 45 35 Q 20 10 5 30 Q 25 45 42 45" fill="#f8fafc" stroke="#cbd5e1" stroke-width="2" />
      <path d="M 45 35 Q 70 10 85 30 Q 65 45 48 45" fill="#f8fafc" stroke="#cbd5e1" stroke-width="2" />
      <!-- Áo trắng & dải lụa -->
      <path d="M 40 38 Q 45 28 50 38 L 56 68 Q 45 74 34 68 Z" fill="#e2e8f0" />
      <circle cx="45" cy="24" r="6" fill="#fed7aa" />
      <!-- Dải băng Gloria in Excelsis Deo -->
      <path d="M 20 70 Q 45 60 70 70" stroke="#f59e0b" stroke-width="3" stroke-linecap="round" fill="none" />
    </svg>`,
    materialReq: {
      materialName: 'Tượng Thiên Thần treo cáp',
      defaultQty: 1,
      unit: 'bộ',
    },
  },
  {
    assetId: 'statue-three-kings',
    name: 'Đoàn Ba Vua Triều Bái',
    category: 'STATUES',
    defaultWidth: 150,
    defaultHeight: 95,
    svgMarkup: `<svg viewBox="0 0 150 95" fill="none" xmlns="http://www.w3.org/2000/svg">
      <!-- Vua 1: Quỳ dâng vàng -->
      <circle cx="35" cy="45" r="6" fill="#fed7aa" />
      <path d="M 22 55 Q 35 48 48 55 L 45 90 L 20 90 Z" fill="#b91c1c" />
      <!-- Vua 2: Đứng dâng nhũ hương -->
      <circle cx="75" cy="30" r="6" fill="#fed7aa" />
      <path d="M 64 40 Q 75 32 86 40 L 86 90 L 64 90 Z" fill="#047857" />
      <path d="M 71 20 L 75 16 L 79 20 L 75 22 Z" fill="#f59e0b" />
      <!-- Vua 3: Đứng dâng mộc dược -->
      <circle cx="115" cy="32" r="6" fill="#fed7aa" />
      <path d="M 104 42 Q 115 35 126 42 L 124 90 L 106 90 Z" fill="#6d28d9" />
    </svg>`,
    materialReq: {
      materialName: 'Bộ Tượng Ba Vua 80cm',
      defaultQty: 1,
      unit: 'bộ',
    },
  },
  {
    assetId: 'statue-sheep-group',
    name: 'Đàn Chiên Cừu (3 con)',
    category: 'STATUES',
    defaultWidth: 110,
    defaultHeight: 55,
    svgMarkup: `<svg viewBox="0 0 110 55" fill="none" xmlns="http://www.w3.org/2000/svg">
      <!-- Cừu 1 -->
      <ellipse cx="30" cy="32" rx="16" ry="12" fill="#f8fafc" stroke="#cbd5e1" stroke-width="2" />
      <circle cx="16" cy="24" r="5" fill="#e2e8f0" />
      <line x1="22" y1="42" x2="22" y2="52" stroke="#475569" stroke-width="2" />
      <line x1="36" y1="42" x2="36" y2="52" stroke="#475569" stroke-width="2" />
      <!-- Cừu 2 nằm -->
      <ellipse cx="65" cy="38" rx="18" ry="10" fill="#f1f5f9" stroke="#cbd5e1" stroke-width="2" />
      <circle cx="82" cy="32" r="5" fill="#e2e8f0" />
    </svg>`,
    materialReq: {
      materialName: 'Cừu thạch cao sơn trắng',
      defaultQty: 3,
      unit: 'con',
    },
  },
  {
    assetId: 'statue-ox-donkey',
    name: 'Bò và Lừa Phục Vụ',
    category: 'STATUES',
    defaultWidth: 120,
    defaultHeight: 65,
    svgMarkup: `<svg viewBox="0 0 120 65" fill="none" xmlns="http://www.w3.org/2000/svg">
      <!-- Bò nằm bên trái -->
      <ellipse cx="40" cy="42" rx="26" ry="16" fill="#92400e" opacity="0.95" />
      <circle cx="20" cy="30" r="10" fill="#78350f" />
      <!-- Lừa nằm bên phải -->
      <ellipse cx="85" cy="44" rx="22" ry="14" fill="#64748b" opacity="0.95" />
      <circle cx="102" cy="30" r="9" fill="#475569" />
    </svg>`,
    materialReq: {
      materialName: 'Bộ tượng Bò và Lừa sưởi ấm',
      defaultQty: 2,
      unit: 'con',
    },
  },

  // ── 3. LIGHTING (4 cấu kiện Chiếu sáng & Hiệu ứng) ────────────────────────
  {
    assetId: 'light-star-bethlehem',
    name: 'Ngôi sao Bê-lem phát sáng',
    category: 'LIGHTING',
    defaultWidth: 90,
    defaultHeight: 90,
    svgMarkup: `<svg viewBox="0 0 90 90" fill="none" xmlns="http://www.w3.org/2000/svg">
      <!-- Hào quang toả rạng -->
      <circle cx="45" cy="45" r="38" fill="#fef08a" opacity="0.3" />
      <circle cx="45" cy="45" r="24" fill="#fde047" opacity="0.6" />
      <!-- Cánh sao 8 góc -->
      <path d="M 45 5 L 49 35 L 79 45 L 49 55 L 45 85 L 41 55 L 11 45 L 41 35 Z" fill="#eab308" stroke="#ca8a04" stroke-width="2" />
      <path d="M 45 20 L 52 38 L 70 45 L 52 52 L 45 70 L 38 52 L 20 45 L 38 38 Z" fill="#ffffff" />
    </svg>`,
    materialReq: {
      materialName: 'Khung sao Bê-lem gắn đèn LED 1.2m',
      defaultQty: 1,
      unit: 'bộ',
      specs: 'Khung nhôm hộp gắn dải LED vàng ấm 30W',
    },
  },
  {
    assetId: 'light-spotlight-amber',
    name: 'Đèn pha hắt sáng vàng',
    category: 'LIGHTING',
    defaultWidth: 60,
    defaultHeight: 50,
    svgMarkup: `<svg viewBox="0 0 60 50" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M 15 35 L 30 15 L 45 35 Z" fill="#334155" stroke="#64748b" stroke-width="2" />
      <ellipse cx="30" cy="35" rx="15" ry="5" fill="#f59e0b" />
      <!-- Chùm tia sáng -->
      <path d="M 20 38 L 0 50 L 60 50 L 40 38 Z" fill="#fef08a" opacity="0.35" />
    </svg>`,
    materialReq: {
      materialName: 'Đèn pha LED chiếu điểm 50W vàng ấm',
      defaultQty: 1,
      unit: 'chiếc',
    },
  },
  {
    assetId: 'light-led-string-warm',
    name: 'Dây đèn LED viền hang (10m)',
    category: 'LIGHTING',
    defaultWidth: 160,
    defaultHeight: 30,
    svgMarkup: `<svg viewBox="0 0 160 30" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M 0 10 Q 40 25 80 10 Q 120 25 160 10" stroke="#047857" stroke-width="2" fill="none" />
      <circle cx="20" cy="15" r="4" fill="#fbbf24" />
      <circle cx="50" cy="18" r="4" fill="#ef4444" />
      <circle cx="80" cy="11" r="4" fill="#38bdf8" />
      <circle cx="110" cy="18" r="4" fill="#fbbf24" />
      <circle cx="140" cy="12" r="4" fill="#a855f7" />
    </svg>`,
    materialReq: {
      materialName: 'Cuộn dây đèn LED trang trí ngoài trời',
      defaultQty: 1,
      unit: 'cuộn',
      specs: 'Dây LED đúc chống nước IP65, dài 10 mét',
    },
  },
  {
    assetId: 'light-smoke-fog',
    name: 'Máy phun khói huyền ảo',
    category: 'LIGHTING',
    defaultWidth: 70,
    defaultHeight: 50,
    svgMarkup: `<svg viewBox="0 0 70 50" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="15" y="22" width="40" height="22" rx="3" fill="#1e293b" stroke="#475569" stroke-width="2" />
      <rect x="55" y="28" width="8" height="8" rx="2" fill="#64748b" />
      <!-- Luồng khói tỏa -->
      <path d="M 60 25 Q 70 10 55 5 Q 40 0 35 15" stroke="#cbd5e1" stroke-width="4" stroke-linecap="round" fill="none" opacity="0.6" />
    </svg>`,
    materialReq: {
      materialName: 'Máy phun khói sân khấu 1000W & dầu khói',
      defaultQty: 1,
      unit: 'máy',
    },
  },

  // ── 4. DECORATION (3 cấu kiện Cây cỏ & Trang trí) ──────────────────────────
  {
    assetId: 'deco-pine-tree-tall',
    name: 'Cây thông tuyết 2.5m',
    category: 'DECORATION',
    defaultWidth: 90,
    defaultHeight: 180,
    svgMarkup: `<svg viewBox="0 0 90 180" fill="none" xmlns="http://www.w3.org/2000/svg">
      <!-- Gốc cây -->
      <rect x="40" y="150" width="10" height="25" fill="#78350f" />
      <!-- Tầng lá dưới -->
      <path d="M 10 150 L 45 100 L 80 150 Z" fill="#15803d" stroke="#166534" stroke-width="2" />
      <!-- Tuyết phủ tầng dưới -->
      <path d="M 22 150 Q 45 140 68 150" stroke="#f8fafc" stroke-width="4" stroke-linecap="round" fill="none" />
      <!-- Tầng lá giữa -->
      <path d="M 18 115 L 45 75 L 72 115 Z" fill="#16a34a" stroke="#15803d" stroke-width="2" />
      <path d="M 28 115 Q 45 108 62 115" stroke="#f8fafc" stroke-width="4" stroke-linecap="round" fill="none" />
      <!-- Tầng lá ngọn -->
      <path d="M 26 80 L 45 40 L 64 80 Z" fill="#22c55e" stroke="#16a34a" stroke-width="2" />
      <path d="M 34 80 Q 45 74 56 80" stroke="#f8fafc" stroke-width="4" stroke-linecap="round" fill="none" />
      <!-- Sao nhỏ đỉnh thông -->
      <path d="M 45 32 L 47 37 L 52 38 L 48 42 L 49 47 L 45 44 L 41 47 L 42 42 L 38 38 L 43 37 Z" fill="#f59e0b" />
    </svg>`,
    materialReq: {
      materialName: 'Cây thông Noel tán tuyết 2.5m',
      defaultQty: 1,
      unit: 'cây',
    },
  },
  {
    assetId: 'deco-fence-wood',
    name: 'Hàng rào gỗ mộc (2m)',
    category: 'DECORATION',
    defaultWidth: 140,
    defaultHeight: 50,
    svgMarkup: `<svg viewBox="0 0 140 50" fill="none" xmlns="http://www.w3.org/2000/svg">
      <!-- Thanh ngang -->
      <rect x="5" y="16" width="130" height="6" rx="2" fill="#b45309" />
      <rect x="5" y="32" width="130" height="6" rx="2" fill="#b45309" />
      <!-- Cọc đứng -->
      <path d="M 15 5 L 20 0 L 25 5 L 25 48 L 15 48 Z" fill="#d97706" stroke="#92400e" stroke-width="1.5" />
      <path d="M 45 5 L 50 0 L 55 5 L 55 48 L 45 48 Z" fill="#d97706" stroke="#92400e" stroke-width="1.5" />
      <path d="M 75 5 L 80 0 L 85 5 L 85 48 L 75 48 Z" fill="#d97706" stroke="#92400e" stroke-width="1.5" />
      <path d="M 105 5 L 110 0 L 115 5 L 115 48 L 105 48 Z" fill="#d97706" stroke="#92400e" stroke-width="1.5" />
    </svg>`,
    materialReq: {
      materialName: 'Hàng rào gỗ thông ghép module 2m',
      defaultQty: 1,
      unit: 'đoạn',
    },
  },
  {
    assetId: 'deco-snow-blanket',
    name: 'Thảm cỏ tuyết nhân tạo',
    category: 'DECORATION',
    defaultWidth: 180,
    defaultHeight: 45,
    svgMarkup: `<svg viewBox="0 0 180 45" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M 10 25 Q 40 10 75 22 Q 110 32 145 18 Q 165 24 175 35 L 165 42 Q 100 48 10 40 Z" fill="#f8fafc" stroke="#e2e8f0" stroke-width="2" />
      <circle cx="45" cy="22" r="3" fill="#cbd5e1" opacity="0.6" />
      <circle cx="115" cy="26" r="3" fill="#cbd5e1" opacity="0.6" />
    </svg>`,
    materialReq: {
      materialName: 'Thảm bông tuyết cuộn trải nền',
      defaultQty: 1,
      unit: 'cuộn',
      specs: 'Khổ rộng 1.5m, dài 5m chất liệu sợi bông tổng hợp trắng',
    },
  },
]

export function getAssetsByCategory(cat: GrottoAssetCategory): GrottoAssetDef[] {
  return GROTTO_ASSETS.filter((a) => a.category === cat)
}

export function getAssetById(id: string): GrottoAssetDef | undefined {
  return GROTTO_ASSETS.find((a) => a.assetId === id)
}
