'use client'

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'

interface Props {
  byStatus: Record<string, number>
  total: number
}

const STATUS_META: Record<string, { label: string; color: string }> = {
  draft:        { label: 'Draft',        color: '#9ca3af' },
  submitted:    { label: 'Submitted',    color: '#fbbf24' },
  under_review: { label: 'Under Review', color: '#0ea5e9' },
  approved:     { label: 'Approved',     color: '#22c55e' },
  rejected:     { label: 'Rejected',     color: '#ef4444' },
  closed:       { label: 'Closed',       color: '#6b7280' },
}

export function StatusDonutChart({ byStatus, total }: Props) {
  const data = Object.entries(byStatus).map(([status, count]) => ({
    status,
    name: STATUS_META[status]?.label ?? status,
    value: count,
    color: STATUS_META[status]?.color ?? '#9ca3af',
  }))

  return (
    <div className="flex items-center gap-8 px-6 py-5">
      <div className="relative shrink-0 w-44 h-44">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={52}
              outerRadius={80}
              paddingAngle={2}
              dataKey="value"
              strokeWidth={0}
            >
              {data.map((entry) => (
                <Cell key={entry.status} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number, name: string) => [value, name]}
              contentStyle={{
                borderRadius: '10px',
                border: '1px solid #e5e7eb',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)',
                fontSize: '13px',
                padding: '8px 12px',
              }}
              itemStyle={{ color: '#374151' }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-3xl font-bold text-gray-900 leading-none">{total}</span>
          <span className="text-xs text-gray-400 mt-1 font-medium uppercase tracking-wide">Total</span>
        </div>
      </div>

      <div className="flex-1 space-y-3">
        {data.map((entry) => {
          const pct = total > 0 ? (entry.value / total) * 100 : 0
          return (
            <div key={entry.status} className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
              <span className="text-sm text-gray-600 w-24 shrink-0">{entry.name}</span>
              <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                <div
                  className="h-2 rounded-full transition-all"
                  style={{ width: `${pct}%`, backgroundColor: entry.color, opacity: 0.8 }}
                />
              </div>
              <span className="text-sm font-semibold text-gray-800 tabular-nums w-6 text-right shrink-0">{entry.value}</span>
              <span className="text-xs text-gray-400 w-9 text-right tabular-nums shrink-0">{pct.toFixed(1)}%</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
