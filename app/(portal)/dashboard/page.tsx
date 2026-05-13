import { Metadata } from 'next'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import Claim from '@/models/Claim'
import Link from 'next/link'
import { ClaimStatusBadge } from '@/components/claims/ClaimStatusBadge'
import { ClaimTypeIcon } from '@/components/claims/ClaimTypeIcon'
import { StatusTimeline } from '@/components/claims/StatusTimeline'
import { Card } from '@/components/ui/Card'
import { IClaim, IStatusHistoryEntry } from '@/types'

export const metadata: Metadata = { title: 'Dashboard' }

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

function formatDate(d: Date | string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

interface StatCard {
  label: string
  value: number
  color: string
  icon: React.ReactNode
}

export default async function DashboardPage() {
  const session = await auth()
  await connectDB()

  const claims = await Claim.find({ claimantId: session!.user.id })
    .sort({ createdAt: -1 })
    .lean() as unknown as IClaim[]

  const stats = {
    total: claims.length,
    pending: claims.filter((c) => ['submitted', 'under_review'].includes(c.status)).length,
    approved: claims.filter((c) => c.status === 'approved').length,
    rejected: claims.filter((c) => c.status === 'rejected').length,
  }

  const recentClaims = claims.slice(0, 10)

  const allHistory = claims
    .flatMap((c) =>
      (c.statusHistory ?? []).map((h: IStatusHistoryEntry) => ({ ...h, claimNumber: c.claimNumber, claimId: c._id }))
    )
    .sort((a, b) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime())
    .slice(0, 10)

  const statCards: StatCard[] = [
    {
      label: 'Total Claims',
      value: stats.total,
      color: 'bg-primary-50 text-primary',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
    {
      label: 'Pending Review',
      value: stats.pending,
      color: 'bg-warning-light text-amber-700',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      label: 'Approved',
      value: stats.approved,
      color: 'bg-success-light text-green-700',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      label: 'Rejected',
      value: stats.rejected,
      color: 'bg-danger-light text-red-700',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  ]

  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <h1 className="text-2xl font-heading font-bold text-gray-900">
          Welcome back, {session!.user.name?.split(' ')[0]}
        </h1>
        <p className="text-gray-500 text-sm mt-1">Here&apos;s an overview of your insurance claims.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <Card key={card.label} className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500">{card.label}</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{card.value}</p>
              </div>
              <div className={`p-2 rounded-lg ${card.color}`}>{card.icon}</div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card
            title="Recent Claims"
            action={
              <Link href="/claims" className="text-sm text-primary font-medium hover:underline">
                View all
              </Link>
            }
          >
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100">
                <thead>
                  <tr className="bg-gray-50">
                    {['Claim #', 'Type', 'Status', 'Filed', 'Amount'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {h}
                      </th>
                    ))}
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {recentClaims.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-gray-400 text-sm">
                        No claims yet.{' '}
                        <Link href="/claims/new" className="text-primary hover:underline">
                          File your first claim
                        </Link>
                      </td>
                    </tr>
                  ) : (
                    recentClaims.map((claim) => (
                      <tr key={String(claim._id)} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-sm font-medium text-primary">
                          <Link href={`/claims/${claim._id}`} className="hover:underline">
                            {claim.claimNumber}
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          <ClaimTypeIcon type={claim.type} />
                        </td>
                        <td className="px-4 py-3">
                          <ClaimStatusBadge status={claim.status} />
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">{formatDate(claim.createdAt)}</td>
                        <td className="px-4 py-3 text-sm text-gray-700 font-medium">
                          {formatCurrency(claim.estimatedAmount)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link href={`/claims/${claim._id}`} className="text-xs text-primary hover:underline">
                            View →
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        <div>
          <Card title="Recent Activity">
            <div className="px-6 py-4">
              {allHistory.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">No activity yet</p>
              ) : (
                <StatusTimeline
                  history={allHistory.map((h) => ({
                    status: h.status,
                    changedBy: String(h.changedBy),
                    changedAt: h.changedAt,
                    note: `${h.claimNumber}: ${h.note}`,
                  }))}
                />
              )}
            </div>
          </Card>
        </div>
      </div>

      <div className="flex justify-center pt-2">
        <Link
          href="/claims/new"
          className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary-700 transition-colors shadow-lg shadow-primary/20"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          File a New Claim
        </Link>
      </div>
    </div>
  )
}
