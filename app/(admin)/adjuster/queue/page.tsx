'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { IClaim, ClaimStatus, ClaimType, IUser } from '@/types'
import { ClaimStatusBadge } from '@/components/claims/ClaimStatusBadge'
import { ClaimTypeIcon } from '@/components/claims/ClaimTypeIcon'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { SkeletonRow } from '@/components/ui/Skeleton'

interface PopulatedClaim extends Omit<IClaim, 'claimantId' | 'assignedAdjusterId'> {
  claimantId: IUser
  assignedAdjusterId: IUser | null
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}
function formatDate(d: Date | string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function QueuePage() {
  const { data: session } = useSession()
  const [claims, setClaims] = useState<PopulatedClaim[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const [filters, setFilters] = useState({
    status: '',
    type: '',
    search: '',
    page: 1,
    limit: 25,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  })

  const fetchQueue = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, String(v)) })
      const res = await fetch(`/api/admin/queue?${params}`)
      const json = await res.json()
      if (json.success) {
        setClaims(json.data)
        setTotal(json.total)
        setTotalPages(json.totalPages)
      }
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => { fetchQueue() }, [fetchQueue])

  function updateFilter(key: string, value: string) {
    setFilters((f) => ({ ...f, [key]: value, page: 1 }))
  }

  async function assignToMe(claimId: string) {
    if (!session?.user?.id) return
    const res = await fetch('/api/admin/assign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ claimId, adjusterId: session.user.id }),
    })
    const json = await res.json()
    if (json.success) {
      toast.success('Claim assigned to you')
      fetchQueue()
    } else {
      toast.error(json.error ?? 'Assignment failed')
    }
  }

  async function bulkAssignToMe() {
    if (!session?.user?.id || selected.size === 0) return
    await Promise.all(
      [...selected].map((id) =>
        fetch('/api/admin/assign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ claimId: id, adjusterId: session.user.id }),
        })
      )
    )
    toast.success(`Assigned ${selected.size} claim${selected.size !== 1 ? 's' : ''} to you`)
    setSelected(new Set())
    fetchQueue()
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (selected.size === claims.length) setSelected(new Set())
    else setSelected(new Set(claims.map((c) => String(c._id))))
  }

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold text-gray-900">Claim Queue</h1>
          <p className="text-sm text-gray-500 mt-1">{total} claim{total !== 1 ? 's' : ''} total</p>
        </div>
        {selected.size > 0 && (
          <Button size="sm" onClick={bulkAssignToMe}>
            Assign {selected.size} to Me
          </Button>
        )}
      </div>

      <Card>
        <div className="px-4 py-3 border-b border-gray-100 flex flex-wrap gap-3">
          <input
            type="text"
            placeholder="Search claim # or claimant..."
            value={filters.search}
            onChange={(e) => updateFilter('search', e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/30 min-w-[200px]"
          />
          <select
            value={filters.status}
            onChange={(e) => updateFilter('status', e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="">All Statuses</option>
            {['draft','submitted','under_review','approved','rejected','closed'].map((s) => (
              <option key={s} value={s}>{s.replace('_', ' ')}</option>
            ))}
          </select>
          <select
            value={filters.type}
            onChange={(e) => updateFilter('type', e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="">All Types</option>
            {['auto','home','health','life','travel'].map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <select
            value={`${filters.sortBy}:${filters.sortOrder}`}
            onChange={(e) => {
              const [sortBy, sortOrder] = e.target.value.split(':')
              setFilters((f) => ({ ...f, sortBy, sortOrder }))
            }}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="createdAt:desc">Newest First</option>
            <option value="createdAt:asc">Oldest First</option>
            <option value="estimatedAmount:desc">Amount High→Low</option>
            <option value="estimatedAmount:asc">Amount Low→High</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selected.size === claims.length && claims.length > 0}
                    onChange={toggleAll}
                    className="rounded border-gray-300 text-primary"
                  />
                </th>
                {['Claim #', 'Claimant', 'Type', 'Status', 'Filed', 'Amount', 'Assigned To', 'Actions'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {loading ? (
                [...Array(5)].map((_, i) => <SkeletonRow key={i} />)
              ) : claims.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-gray-400 text-sm">
                    No claims found
                  </td>
                </tr>
              ) : (
                claims.map((claim) => (
                  <tr key={String(claim._id)} className={`hover:bg-gray-50 transition-colors ${selected.has(String(claim._id)) ? 'bg-primary-50' : ''}`}>
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selected.has(String(claim._id))}
                        onChange={() => toggleSelect(String(claim._id))}
                        className="rounded border-gray-300 text-primary"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/adjuster/${claim._id}`} className="text-sm font-medium text-primary hover:underline">
                        {claim.claimNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{claim.claimantId?.name ?? '—'}</td>
                    <td className="px-4 py-3"><ClaimTypeIcon type={claim.type} /></td>
                    <td className="px-4 py-3"><ClaimStatusBadge status={claim.status} /></td>
                    <td className="px-4 py-3 text-sm text-gray-500">{formatDate(claim.createdAt)}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-700">{formatCurrency(claim.estimatedAmount)}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {claim.assignedAdjusterId ? (
                        <span className="text-gray-700">{claim.assignedAdjusterId.name}</span>
                      ) : (
                        <span className="text-gray-300 text-xs">Unassigned</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Link href={`/adjuster/${claim._id}`} className="text-xs text-primary font-medium hover:underline">
                          Review
                        </Link>
                        {!claim.assignedAdjusterId && (
                          <button
                            onClick={() => assignToMe(String(claim._id))}
                            className="text-xs text-gray-500 hover:text-primary transition-colors"
                          >
                            Assign Me
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-sm text-gray-500">Page {filters.page} of {totalPages}</p>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={filters.page <= 1}
                onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))}
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={filters.page >= totalPages}
                onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}
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
