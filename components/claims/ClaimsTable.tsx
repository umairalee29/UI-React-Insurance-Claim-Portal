'use client'

import Link from 'next/link'
import { IClaim } from '@/types'
import { ClaimStatusBadge } from './ClaimStatusBadge'
import { ClaimTypeIcon } from './ClaimTypeIcon'
import { SkeletonRow } from '@/components/ui/Skeleton'

interface ClaimsTableProps {
  claims: IClaim[]
  loading?: boolean
  basePath?: string
  showClaimant?: boolean
  showAssignee?: boolean
  actions?: (claim: IClaim) => React.ReactNode
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount)
}

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function ClaimsTable({
  claims,
  loading,
  basePath = '/claims',
  showClaimant = false,
  showAssignee = false,
  actions,
}: ClaimsTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-100">
        <thead>
          <tr className="bg-gray-50">
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Claim #
            </th>
            {showClaimant && (
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Claimant
              </th>
            )}
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Type
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Date Filed
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Est. Amount
            </th>
            {showAssignee && (
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Assigned To
              </th>
            )}
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-100">
          {loading ? (
            [...Array(5)].map((_, i) => <SkeletonRow key={i} />)
          ) : claims.length === 0 ? (
            <tr>
              <td
                colSpan={6 + (showClaimant ? 1 : 0) + (showAssignee ? 1 : 0)}
                className="px-4 py-12 text-center text-gray-400 text-sm"
              >
                No claims found
              </td>
            </tr>
          ) : (
            claims.map((claim) => {
              const claimant = claim.claimantId as unknown as { name: string; email: string } | string
              const adjuster = claim.assignedAdjusterId as unknown as { name: string } | null

              return (
                <tr key={String(claim._id)} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <Link
                      href={`${basePath}/${claim._id}`}
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      {claim.claimNumber}
                    </Link>
                  </td>
                  {showClaimant && (
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {typeof claimant === 'object' ? claimant.name : '—'}
                    </td>
                  )}
                  <td className="px-4 py-3">
                    <ClaimTypeIcon type={claim.type} />
                  </td>
                  <td className="px-4 py-3">
                    <ClaimStatusBadge status={claim.status} />
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {formatDate(claim.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 font-medium">
                    {formatCurrency(claim.estimatedAmount)}
                  </td>
                  {showAssignee && (
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {adjuster ? adjuster.name : <span className="text-gray-300">Unassigned</span>}
                    </td>
                  )}
                  <td className="px-4 py-3 text-right">
                    {actions ? (
                      actions(claim)
                    ) : (
                      <Link
                        href={`${basePath}/${claim._id}`}
                        className="text-xs text-primary font-medium hover:underline"
                      >
                        View
                      </Link>
                    )}
                  </td>
                </tr>
              )
            })
          )}
        </tbody>
      </table>
    </div>
  )
}
