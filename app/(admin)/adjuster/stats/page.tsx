import { Metadata } from 'next'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { connectDB } from '@/lib/db'
import Claim from '@/models/Claim'
import { Card } from '@/components/ui/Card'
import { StatusDonutChart } from '@/components/charts/StatusDonutChart'

export const metadata: Metadata = { title: 'Statistics' }

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

interface AggResult { _id: string; count: number }
interface ApprovedClaim { estimatedAmount: number; approvedAmount?: number; createdAt: Date; updatedAt: Date }

export default async function StatsPage() {
  const session = await auth()
  if (!session || session.user.role === 'claimant') redirect('/login')

  await connectDB()

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const [byStatusAgg, byTypeAgg, thisMonth, approvedClaims, unassigned] = await Promise.all([
    Claim.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]) as Promise<AggResult[]>,
    Claim.aggregate([{ $group: { _id: '$type', count: { $sum: 1 } } }]) as Promise<AggResult[]>,
    Claim.countDocuments({ createdAt: { $gte: startOfMonth } }),
    Claim.find({ status: 'approved', approvedAmount: { $exists: true } })
      .select('estimatedAmount approvedAmount createdAt updatedAt')
      .lean() as Promise<ApprovedClaim[]>,
    Claim.countDocuments({ $or: [{ assignedAdjusterId: null }, { assignedAdjusterId: { $exists: false } }] }),
  ])

  const byStatus = Object.fromEntries(byStatusAgg.map((s) => [s._id, s.count]))
  const byType = Object.fromEntries(byTypeAgg.map((t) => [t._id, t.count]))
  const totalApproved = approvedClaims.reduce((sum, c) => sum + (c.approvedAmount ?? 0), 0)
  const total = Object.values(byStatus).reduce((a, b) => a + b, 0)

  const avgProcessingDays =
    approvedClaims.length > 0
      ? Math.round(
          approvedClaims.reduce((sum, c) => {
            return sum + (c.updatedAt.getTime() - c.createdAt.getTime()) / (1000 * 60 * 60 * 24)
          }, 0) / approvedClaims.length
        )
      : 0

  const decidedClaims = (byStatus['approved'] ?? 0) + (byStatus['rejected'] ?? 0)
  const approvalRate = decidedClaims > 0
    ? ((byStatus['approved'] ?? 0) / decidedClaims * 100).toFixed(1)
    : '—'
  const resolvedClaims = (byStatus['approved'] ?? 0) + (byStatus['rejected'] ?? 0) + (byStatus['closed'] ?? 0)
  const resolutionRate = total > 0
    ? (resolvedClaims / total * 100).toFixed(1)
    : '—'

  const TYPE_CONFIG_CHART: Record<string, { label: string; bar: string; bg: string; dot: string }> = {
    auto:   { label: '🚗 Auto',    bar: 'bg-blue-500',    bg: 'bg-blue-100',    dot: 'bg-blue-500' },
    home:   { label: '🏠 Home',    bar: 'bg-violet-500',  bg: 'bg-violet-100',  dot: 'bg-violet-500' },
    health: { label: '❤️ Health',  bar: 'bg-rose-500',    bg: 'bg-rose-100',    dot: 'bg-rose-500' },
    life:   { label: '🛡️ Life',   bar: 'bg-emerald-500', bg: 'bg-emerald-100', dot: 'bg-emerald-500' },
    travel: { label: '✈️ Travel',  bar: 'bg-orange-500',  bg: 'bg-orange-100',  dot: 'bg-orange-500' },
  }

  const kpiCards = [
    {
      label: 'Total Claims',
      value: String(total),
      iconBg: 'bg-blue-50',
      iconColor: 'text-blue-600',
      borderColor: 'border-t-blue-500',
      icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />,
    },
    {
      label: 'This Month',
      value: String(thisMonth),
      iconBg: 'bg-violet-50',
      iconColor: 'text-violet-600',
      borderColor: 'border-t-violet-500',
      icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />,
    },
    {
      label: 'Approved',
      value: String(byStatus['approved'] ?? 0),
      iconBg: 'bg-green-50',
      iconColor: 'text-green-600',
      borderColor: 'border-t-green-500',
      icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />,
    },
    {
      label: 'Total Approved',
      value: formatCurrency(totalApproved),
      iconBg: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
      borderColor: 'border-t-emerald-500',
      icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />,
    },
    {
      label: 'Avg. Processing',
      value: `${avgProcessingDays} days`,
      iconBg: 'bg-orange-50',
      iconColor: 'text-orange-600',
      borderColor: 'border-t-orange-500',
      icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />,
    },
    {
      label: 'Pending Review',
      value: String(byStatus['submitted'] ?? 0),
      iconBg: 'bg-amber-50',
      iconColor: 'text-amber-600',
      borderColor: 'border-t-amber-500',
      icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />,
    },
    {
      label: 'Under Review',
      value: String(byStatus['under_review'] ?? 0),
      iconBg: 'bg-sky-50',
      iconColor: 'text-sky-600',
      borderColor: 'border-t-sky-500',
      icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />,
    },
    {
      label: 'Rejected',
      value: String(byStatus['rejected'] ?? 0),
      iconBg: 'bg-red-50',
      iconColor: 'text-red-600',
      borderColor: 'border-t-red-500',
      icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />,
    },
  ]

  return (
    <div className="w-full space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-gray-900">Statistics</h1>
        <p className="text-sm text-gray-500 mt-1">Overview of all claims in the system</p>
      </div>

      <div className="rounded-xl bg-gradient-to-br from-primary to-primary/75 px-8 py-6 grid grid-cols-3 divide-x divide-white/20">
        {[
          {
            label: 'Approval Rate',
            value: approvalRate === '—' ? '—' : `${approvalRate}%`,
            sub: `${byStatus['approved'] ?? 0} approved of ${decidedClaims} decided`,
            icon: (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            ),
          },
          {
            label: 'Resolution Rate',
            value: resolutionRate === '—' ? '—' : `${resolutionRate}%`,
            sub: `${resolvedClaims} of ${total} claims resolved`,
            icon: (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            ),
          },
          {
            label: 'Unassigned Claims',
            value: String(unassigned),
            sub: unassigned === 0 ? 'All claims have an adjuster' : 'Awaiting adjuster assignment',
            icon: (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            ),
          },
        ].map((item, i) => (
          <div key={i} className="flex items-center gap-4 px-8 first:pl-0 last:pr-0">
            <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {item.icon}
              </svg>
            </div>
            <div>
              <p className="text-xs font-medium text-white/60 uppercase tracking-wide">{item.label}</p>
              <p className="text-3xl font-bold text-white leading-tight mt-0.5">{item.value}</p>
              <p className="text-xs text-white/50 mt-1">{item.sub}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((card) => (
          <div
            key={card.label}
            className={`bg-white rounded-xl border border-gray-100 border-t-2 ${card.borderColor} shadow-sm p-5 flex flex-col gap-4`}
          >
            <div className={`w-10 h-10 rounded-lg ${card.iconBg} flex items-center justify-center shrink-0`}>
              <svg className={`w-5 h-5 ${card.iconColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {card.icon}
              </svg>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{card.label}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{card.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card title="Claims by Status">
          <StatusDonutChart byStatus={byStatus} total={total} />
        </Card>

        <Card title="Claims by Type" className="flex flex-col">
          <div className="flex-1 flex flex-col justify-between px-6 py-5">
            {Object.entries(byType).map(([type, count]) => {
              const cfg = TYPE_CONFIG_CHART[type] ?? { label: type, bar: 'bg-gray-400', bg: 'bg-gray-100', dot: 'bg-gray-400' }
              const typeTotal = Object.values(byType).reduce((a, b) => a + b, 0)
              const pct = typeTotal > 0 ? (count / typeTotal) * 100 : 0
              return (
                <div key={type} className="flex items-center gap-3">
                  <div className="flex items-center gap-2 w-32 shrink-0">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${cfg.dot}`} />
                    <span className="text-sm text-gray-600 truncate">{cfg.label}</span>
                  </div>
                  <div className={`flex-1 ${cfg.bg} rounded-full h-2.5`}>
                    <div
                      className={`${cfg.bar} h-2.5 rounded-full transition-all`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="flex items-center gap-1.5 w-16 justify-end shrink-0">
                    <span className="text-sm font-semibold text-gray-800">{count}</span>
                    <span className="text-xs text-gray-400">{pct.toFixed(0)}%</span>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      </div>
    </div>
  )
}
