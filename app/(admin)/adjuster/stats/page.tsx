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

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-gray-900">Statistics</h1>
        <p className="text-sm text-gray-500 mt-1">Overview of all claims in the system</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Claims', value: String(total) },
          { label: 'This Month', value: String(thisMonth) },
          { label: 'Approved', value: String(byStatus['approved'] ?? 0) },
          { label: 'Total Approved $', value: formatCurrency(totalApproved) },
          { label: 'Avg. Processing', value: `${avgProcessingDays} days` },
          { label: 'Pending Review', value: String(byStatus['submitted'] ?? 0) },
          { label: 'Under Review', value: String(byStatus['under_review'] ?? 0) },
          { label: 'Rejected', value: String(byStatus['rejected'] ?? 0) },
        ].map((stat) => (
          <Card key={stat.label} className="p-5">
            <p className="text-sm text-gray-500">{stat.label}</p>
            <p className="text-xl font-bold text-gray-900 mt-1">{stat.value}</p>
          </Card>
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
