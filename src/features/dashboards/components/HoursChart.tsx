// BarChart giờ công theo ngày — dùng chung Committee (tuần hiện tại nổi bật
// pine, tuần trước pine nhạt) và Leader (đơn sắc pine). Recharts vẽ SVG nên
// chạy tốt trong jsdom, không cần ResizeObserver thật.
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useTranslation } from 'react-i18next'

export interface DayHours {
  date: string // ISO yyyy-mm-dd
  hours: number
}

const HIGHLIGHT = '#0A5C36'
const BASE = '#0A5C36'
const BASE_FADED = '#B7C9BD'

// highlightFrom: ngày ISO bắt đầu tuần hiện tại (weekFrom phía mock trả về
// ngày đầu tuần); cột ≥ mốc đó tô pine, còn lại pine nhạt. Không có mốc →
// mọi cột pine (Leader dùng, không cần phân biệt tuần).
export function HoursChart({ data, highlightFrom }: { data: DayHours[]; highlightFrom?: string }) {
  const { t } = useTranslation()
  return (
    <div className="h-44" aria-label={t('features.dashboards.hoursByDay')}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
          <CartesianGrid stroke="#E9ECEF" strokeDasharray="3 3" vertical={false} />
          {/* Trục X hiển thị dd/MM (5 ký tự đầu của viDate). */}
          <XAxis
            dataKey="date"
            tickFormatter={(iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`}
            tick={{ fontSize: 11, fill: '#6C757D' }}
            tickLine={false}
          />
          <YAxis tick={{ fontSize: 11, fill: '#6C757D' }} tickLine={false} axisLine={false} />
          <Tooltip cursor={{ fill: '#F1F5F2' }} />
          <Bar
            dataKey="hours"
            name={t('features.volunteers.hourUnit')}
            radius={[6, 6, 0, 0]}
            maxBarSize={28}
          >
            {data.map((d) => (
              <Cell
                key={d.date}
                fill={highlightFrom ? (d.date >= highlightFrom ? HIGHLIGHT : BASE_FADED) : BASE}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
