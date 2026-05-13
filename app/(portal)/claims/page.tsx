'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useClaimsStore } from '@/hooks/useClaims'
import { ClaimsTable } from '@/components/claims/ClaimsTable'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ClaimStatus, ClaimType } from '@/types'

export default function ClaimsPage() {
  const { claims, loading, total, totalPages, filters, setFilters, fetchClaims } = useClaimsStore()

  useEffect(() => {
    fetchClaims()
  }, [fetchClaims])

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold text-gray-900">My Claims</h1>
          <p className="text-sm text-gray-500 mt-1">{total} claim{total !== 1 ? 's' : ''} total</p>
        </div>
        <Link href="/claims/new">
          <Button size="sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Claim
          </Button>
        </Link>
      </div>

      <Card>
        <div className="px-4 py-3 border-b border-gray-100 flex flex-wrap gap-3">
          <select
            value={filters.status ?? ''}
            onChange={(e) => setFilters({ status: (e.target.value as ClaimStatus) || undefined })}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="">All Statuses</option>
            {['draft','submitted','under_review','approved','rejected','closed'].map((s) => (
              <option key={s} value={s}>{s.replace('_', ' ')}</option>
            ))}
          </select>
          <select
            value={filters.type ?? ''}
            onChange={(e) => setFilters({ type: (e.target.value as ClaimType) || undefined })}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="">All Types</option>
            {['auto','home','health','life','travel'].map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        <ClaimsTable claims={claims} loading={loading} basePath="/claims" />

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-sm text-gray-500">Page {filters.page} of {totalPages}</p>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={(filters.page ?? 1) <= 1}
                onClick={() => setFilters({ page: (filters.page ?? 1) - 1 })}
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={(filters.page ?? 1) >= totalPages}
                onClick={() => setFilters({ page: (filters.page ?? 1) + 1 })}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
