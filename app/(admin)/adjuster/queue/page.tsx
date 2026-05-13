'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { IClaim, ClaimStatus, ClaimType, IUser } from '@/types'
import { ClaimStatusBadge, STATUS_CONFIG } from '@/components/claims/ClaimStatusBadge'
import { ClaimTypeIcon, TYPE_CONFIG } from '@/components/claims/ClaimTypeIcon'
import { ClaimDrawer } from '@/components/claims/ClaimDrawer'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
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
  const [pendingClaim, setPendingClaim] = useState<{ _id: unknown; claimNumber: string } | null>(null)
  const [assigning, setAssigning] = useState(false)
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false)
  const [bulkAssigning, setBulkAssigning] = useState(false)
  const [drawerClaimId, setDrawerClaimId] = useState<string | null>(null)

  const [typeOpen, setTypeOpen] = useState(false)
  const [statusOpen, setStatusOpen] = useState(false)
  const typeRef = useRef<HTMLDivElement>(null)
  const statusRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (typeRef.current && !typeRef.current.contains(e.target as Node)) setTypeOpen(false)
      if (statusRef.current && !statusRef.current.contains(e.target as Node)) setStatusOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const [filters, setFilters] = useState({
    status: '',
    type: '',
    search: '',
    page: 1,
    limit: 25,
    sortBy: '',
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

  async function confirmAssign() {
    if (!session?.user?.id || !pendingClaim) return
    setAssigning(true)
    try {
      const res = await fetch('/api/admin/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claimId: String(pendingClaim._id), adjusterId: session.user.id }),
      })
      const json = await res.json()
      if (json.success) {
        toast.success(`${pendingClaim.claimNumber} assigned to you`)
        setPendingClaim(null)
        fetchQueue()
      } else {
        toast.error(json.error ?? 'Assignment failed')
      }
    } finally {
      setAssigning(false)
    }
  }

  async function bulkAssignToMe() {
    if (!session?.user?.id || selected.size === 0) return
    setBulkAssigning(true)
    try {
      await Promise.all(
        [...selected].map((id) =>
          fetch('/api/admin/assign', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ claimId: id, adjusterId: session.user.id }),
          })
        )
      )
      toast.success(`${selected.size} claim${selected.size !== 1 ? 's' : ''} assigned to you`)
      setSelected(new Set())
      setBulkConfirmOpen(false)
      fetchQueue()
    } finally {
      setBulkAssigning(false)
    }
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

  function handleSort(field: string) {
    setFilters((f) => {
      if (f.sortBy !== field) return { ...f, sortBy: field, sortOrder: 'desc', page: 1 }
      if (f.sortOrder === 'desc') return { ...f, sortOrder: 'asc', page: 1 }
      return { ...f, sortBy: '', sortOrder: 'desc', page: 1 }
    })
  }

  function SortIcon({ field }: { field: string }) {
    const active = filters.sortBy === field
    const asc = active && filters.sortOrder === 'asc'
    const desc = active && filters.sortOrder === 'desc'
    return (
      <span className="inline-flex flex-col gap-[1px] ml-1.5 align-middle">
        <svg width="8" height="5" viewBox="0 0 8 5" fill="none">
          <path d="M4 0L8 5H0L4 0Z" fill={asc ? '#0f2d5c' : '#d1d5db'} />
        </svg>
        <svg width="8" height="5" viewBox="0 0 8 5" fill="none">
          <path d="M4 5L0 0H8L4 5Z" fill={desc ? '#0f2d5c' : '#d1d5db'} />
        </svg>
      </span>
    )
  }

  const columns: { label: string; field?: string }[] = [
    { label: 'Claim #', field: 'claimNumber' },
    { label: 'Claimant' },
    { label: 'Type', field: 'type' },
    { label: 'Status', field: 'status' },
    { label: 'Filed', field: 'createdAt' },
    { label: 'Amount', field: 'estimatedAmount' },
    { label: 'Assigned To' },
    { label: 'Actions' },
  ]

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold text-gray-900">Claim Queue</h1>
          <p className="text-sm text-gray-500 mt-1">{total} claim{total !== 1 ? 's' : ''} total</p>
        </div>
        {selected.size > 0 && (
          <Button size="sm" onClick={() => setBulkConfirmOpen(true)}>
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
          <div ref={statusRef} className="relative">
            <button
              onClick={() => setStatusOpen((o) => !o)}
              className="flex items-center gap-2 text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors min-w-[140px]"
            >
              {filters.status ? (
                <ClaimStatusBadge status={filters.status as ClaimStatus} />
              ) : (
                <span className="text-gray-500">All Statuses</span>
              )}
              <svg className={`ml-auto w-3.5 h-3.5 text-gray-400 transition-transform ${statusOpen ? 'rotate-180' : ''}`} viewBox="0 0 12 12" fill="none">
                <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>

            {statusOpen && (
              <div className="absolute z-20 mt-1.5 left-0 bg-white border border-gray-100 rounded-xl shadow-lg py-1 min-w-[160px]">
                <button
                  onClick={() => { updateFilter('status', ''); setStatusOpen(false) }}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 transition-colors ${!filters.status ? 'bg-gray-50' : ''}`}
                >
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                    All Statuses
                  </span>
                </button>
                {(Object.entries(STATUS_CONFIG) as [ClaimStatus, typeof STATUS_CONFIG[ClaimStatus]][]).map(([key, cfg]) => (
                  <button
                    key={key}
                    onClick={() => { updateFilter('status', key); setStatusOpen(false) }}
                    className={`w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 transition-colors ${filters.status === key ? 'bg-gray-50' : ''}`}
                  >
                    <ClaimStatusBadge status={key} />
                  </button>
                ))}
              </div>
            )}
          </div>
          <div ref={typeRef} className="relative">
            <button
              onClick={() => setTypeOpen((o) => !o)}
              className="flex items-center gap-2 text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors min-w-[130px]"
            >
              {filters.type ? (
                <ClaimTypeIcon type={filters.type as ClaimType} />
              ) : (
                <span className="text-gray-500">All Types</span>
              )}
              <svg className={`ml-auto w-3.5 h-3.5 text-gray-400 transition-transform ${typeOpen ? 'rotate-180' : ''}`} viewBox="0 0 12 12" fill="none">
                <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>

            {typeOpen && (
              <div className="absolute z-20 mt-1.5 left-0 bg-white border border-gray-100 rounded-xl shadow-lg py-1 min-w-[150px]">
                <button
                  onClick={() => { updateFilter('type', ''); setTypeOpen(false) }}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 transition-colors ${!filters.type ? 'bg-gray-50' : ''}`}
                >
                  <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-md bg-gray-100 text-gray-500">
                    All Types
                  </span>
                </button>
                {(Object.entries(TYPE_CONFIG) as [ClaimType, typeof TYPE_CONFIG[ClaimType]][]).map(([key, cfg]) => (
                  <button
                    key={key}
                    onClick={() => { updateFilter('type', key); setTypeOpen(false) }}
                    className={`w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 transition-colors ${filters.type === key ? 'bg-gray-50' : ''}`}
                  >
                    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-md ${cfg.bg} ${cfg.text}`}>
                      <span>{cfg.icon}</span>
                      {cfg.label}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
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
                {columns.map(({ label, field }) => (
                  <th key={label} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {field ? (
                      <button
                        onClick={() => handleSort(field)}
                        className="inline-flex items-center gap-0 hover:text-gray-900 transition-colors select-none"
                      >
                        {label}
                        <SortIcon field={field} />
                      </button>
                    ) : (
                      label
                    )}
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
                  <tr
                    key={String(claim._id)}
                    onClick={() => setDrawerClaimId(String(claim._id))}
                    className={`cursor-pointer hover:bg-gray-50 transition-colors ${selected.has(String(claim._id)) ? 'bg-primary-50' : ''}`}
                  >
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
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
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/adjuster/${claim._id}`}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border border-primary/25 text-primary bg-primary/5 hover:bg-primary/10 hover:border-primary/40 transition-all"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          Review
                        </Link>

                        {!claim.assignedAdjusterId ? (
                          <button
                            onClick={() => setPendingClaim({ _id: claim._id, claimNumber: claim.claimNumber ?? '' })}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 hover:border-emerald-300 transition-all"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                            </svg>
                            Assign Me
                          </button>
                        ) : String(claim.assignedAdjusterId._id) === session?.user?.id ? (
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                            </svg>
                            You
                          </span>
                        ) : null}
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
      <ClaimDrawer
        claimId={drawerClaimId}
        onClose={() => setDrawerClaimId(null)}
        currentUserId={session?.user?.id}
        onAssignMe={(c) => {
          setPendingClaim(c)
          setDrawerClaimId(null)
        }}
      />

      <Modal
        isOpen={bulkConfirmOpen}
        onClose={() => !bulkAssigning && setBulkConfirmOpen(false)}
        title="Confirm Bulk Assignment"
        footer={
          <>
            <Button variant="secondary" size="md" disabled={bulkAssigning} onClick={() => setBulkConfirmOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="md" loading={bulkAssigning} onClick={bulkAssignToMe}>
              Yes, Assign All
            </Button>
          </>
        }
      >
        <div className="flex flex-col items-center text-center gap-4 py-2">
          <div className="relative">
            <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center">
              <svg className="w-7 h-7 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            </div>
            <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-primary text-white text-[11px] font-bold flex items-center justify-center ring-2 ring-white">
              {selected.size}
            </span>
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900">
              Assign {selected.size} claim{selected.size !== 1 ? 's' : ''} to yourself?
            </h3>
            <p className="mt-1.5 text-sm text-gray-500">
              All{' '}
              <span className="font-medium text-gray-700">
                {selected.size} selected claim{selected.size !== 1 ? 's' : ''}
              </span>{' '}
              will be assigned to you and added to your queue.
            </p>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={!!pendingClaim}
        onClose={() => !assigning && setPendingClaim(null)}
        title="Confirm Assignment"
        footer={
          <>
            <Button variant="secondary" size="md" disabled={assigning} onClick={() => setPendingClaim(null)}>
              Cancel
            </Button>
            <Button variant="primary" size="md" loading={assigning} onClick={confirmAssign}>
              Yes, Assign
            </Button>
          </>
        }
      >
        <div className="flex flex-col items-center text-center gap-4 py-2">
          <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center">
            <svg className="w-7 h-7 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900">Assign this claim to yourself?</h3>
            <p className="mt-1.5 text-sm text-gray-500">
              Claim{' '}
              <span className="font-medium text-gray-700">{pendingClaim?.claimNumber}</span>{' '}
              will be assigned to you and added to your queue.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  )
}
