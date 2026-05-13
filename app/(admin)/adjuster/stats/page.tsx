import { Metadata } from 'next'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { connectDB } from '@/lib/db'
import Claim from '@/models/Claim'
import { Card } from '@/components/ui/Card'

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

  const [byStatusAgg, byTypeAgg, thisMonth, approvedClaims] = await Promise.all([
    Claim.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]) as Promise<AggResult[]>,
    Claim.aggregate([{ $group: { _id: '$type', count: { $sum: 1 } } }]) as Promise<AggResult[]>,
    Claim.countDocuments({ createdAt: { $gte: startOfMonth } }),
    Claim.find({ status: 'approved', approvedAmount: { $exists: true } })
      .select('estimatedAmount approvedAmount createdAt updatedAt')
      .lean() as Promise<ApprovedClaim[]>,
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

  const STATUS_LABELS: Record<string, string> = {
    draft: 'Draft', submitted: 'Submitted', under_review: 'Under Review',
    approved: 'Approved', rejected: 'Rejected', closed: 'Closed',
  }
  const TYPE_LABELS: Record<string, string> = {
    auto: '🚗 Auto', home: '🏠 Home', health: '❤️ Health', life: '🛡️ Life', travel: '✈️ Travel',
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
          <div className="px-6 py-4 space-y-3">
            {Object.entries(byStatus).map(([status, count]) => (
              <div key={status} className="flex items-center gap-3">
                <span className="text-sm text-gray-600 w-28">{STATUS_LABELS[status] ?? status}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full"
                    style={{ width: `${total > 0 ? (count / total) * 100 : 0}%` }}
                  />
                </div>
                <span className="text-sm font-medium text-gray-900 w-8 text-right">{count}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Claims by Type">
          <div className="px-6 py-4 space-y-3">
            {Object.entries(byType).map(([type, count]) => (
              <div key={type} className="flex items-center gap-3">
                <span className="text-sm text-gray-600 w-28">{TYPE_LABELS[type] ?? type}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full"
                    style={{ width: `${total > 0 ? (count / total) * 100 : 0}%` }}
                  />
                </div>
                <span className="text-sm font-medium text-gray-900 w-8 text-right">{count}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
