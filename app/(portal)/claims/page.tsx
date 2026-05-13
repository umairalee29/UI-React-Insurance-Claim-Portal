'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useClaimsStore } from '@/hooks/useClaims'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ClaimStatusBadge } from '@/components/claims/ClaimStatusBadge'
import { ClaimTypeIcon, TYPE_CONFIG as TYPE_ICON_CONFIG } from '@/components/claims/ClaimTypeIcon'
import { IClaim, ClaimStatus, ClaimType } from '@/types'

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

function formatDate(d: Date | string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const TYPE_CONFIG: Record<string, { label: string; iconBg: string; iconColor: string; iconPath: string }> = {
  auto:   { label: 'Auto Insurance',   iconBg: 'bg-blue-100',    iconColor: 'text-blue-600',    iconPath: 'M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0zM13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10h1m8 0H9m4 0h2m4 0h1v-5l-3-4h-2' },
  home:   { label: 'Home Insurance',   iconBg: 'bg-violet-100',  iconColor: 'text-violet-600',  iconPath: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  health: { label: 'Health Insurance', iconBg: 'bg-rose-100',    iconColor: 'text-rose-600',    iconPath: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z' },
  life:   { label: 'Life Insurance',   iconBg: 'bg-emerald-100', iconColor: 'text-emerald-600', iconPath: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
  travel: { label: 'Travel Insurance', iconBg: 'bg-orange-100',  iconColor: 'text-orange-600',  iconPath: 'M12 19l9 2-9-18-9 18 9-2zm0 0v-8' },
}

const STATUS_BORDER: Record<string, string> = {
  draft:        'border-l-gray-300',
  submitted:    'border-l-blue-400',
  under_review: 'border-l-amber-400',
  approved:     'border-l-green-500',
  rejected:     'border-l-red-500',
  closed:       'border-l-purple-500',
}

const STATUS_PILLS: { value: string; label: string; active: string; inactive: string }[] = [
  { value: '',             label: 'All',          active: 'bg-gray-800 text-white border-gray-800',     inactive: 'border-gray-200 text-gray-500 hover:bg-gray-50'        },
  { value: 'draft',        label: 'Draft',        active: 'bg-gray-500 text-white border-gray-500',     inactive: 'border-gray-200 text-gray-500 hover:bg-gray-50'        },
  { value: 'submitted',    label: 'Submitted',    active: 'bg-blue-500 text-white border-blue-500',     inactive: 'border-blue-200 text-blue-600 hover:bg-blue-50'        },
  { value: 'under_review', label: 'Under Review', active: 'bg-amber-500 text-white border-amber-500',   inactive: 'border-amber-200 text-amber-600 hover:bg-amber-50'     },
  { value: 'approved',     label: 'Approved',     active: 'bg-green-500 text-white border-green-500',   inactive: 'border-green-200 text-green-600 hover:bg-green-50'     },
  { value: 'rejected',     label: 'Rejected',     active: 'bg-red-500 text-white border-red-500',       inactive: 'border-red-200 text-red-600 hover:bg-red-50'           },
  { value: 'closed',       label: 'Closed',       active: 'bg-purple-500 text-white border-purple-500', inactive: 'border-purple-200 text-purple-600 hover:bg-purple-50'  },
]

function ClaimCard({ claim }: { claim: IClaim }) {
  const typeCfg = TYPE_CONFIG[claim.type] ?? TYPE_CONFIG.auto
  const borderCls = STATUS_BORDER[claim.status] ?? 'border-l-gray-200'
  const isApproved = claim.status === 'approved' && claim.approvedAmount
  const amount = isApproved ? claim.approvedAmount! : claim.estimatedAmount
  const docCount = claim.documents?.length ?? 0

  return (
    <Link
      href={`/claims/${claim._id}`}
      className={`flex items-center gap-4 p-5 bg-white border border-gray-100 border-l-4 ${borderCls} rounded-xl shadow-sm hover:shadow-md hover:border-gray-200 transition-all group`}
    >
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${typeCfg.iconBg}`}>
        <svg className={`w-6 h-6 ${typeCfg.iconColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={typeCfg.iconPath} />
        </svg>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2.5 flex-wrap">
          <p className="text-sm font-bold text-gray-900 group-hover:text-primary transition-colors">
            {claim.claimNumber}
          </p>
          <ClaimStatusBadge status={claim.status} />
        </div>
        <p className="text-xs text-gray-400 mt-0.5">{typeCfg.label} · Filed {formatDate(claim.createdAt)}</p>
        <p className="text-xs text-gray-400 mt-0.5">Incident: {formatDate(claim.incidentDate)}</p>
      </div>

      <div className="hidden sm:flex items-center gap-1.5 text-gray-400 shrink-0">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <span className="text-xs">{docCount} doc{docCount !== 1 ? 's' : ''}</span>
      </div>

      <div className="text-right shrink-0">
        <p className="text-base font-bold text-gray-900">{formatCurrency(amount)}</p>
        <p className={`text-xs mt-0.5 font-medium ${isApproved ? 'text-green-500' : 'text-gray-400 group-hover:text-primary transition-colors'}`}>
          {isApproved ? 'Approved amount' : 'View details →'}
        </p>
      </div>
    </Link>
  )
}

function ClaimCardSkeleton() {
  return (
    <div className="flex items-center gap-4 p-5 bg-white border border-gray-100 border-l-4 border-l-gray-200 rounded-xl shadow-sm">
      <div className="w-12 h-12 rounded-xl bg-gray-100 animate-pulse shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2.5">
          <div className="h-4 w-32 bg-gray-200 rounded-md animate-pulse" />
          <div className="h-5 w-20 bg-gray-100 rounded-full animate-pulse" />
        </div>
        <div className="h-3 w-48 bg-gray-100 rounded-md animate-pulse" />
        <div className="h-3 w-36 bg-gray-100 rounded-md animate-pulse" />
      </div>
      <div className="hidden sm:flex items-center gap-1.5">
        <div className="h-3 w-12 bg-gray-100 rounded-md animate-pulse" />
      </div>
      <div className="text-right space-y-1.5 shrink-0">
        <div className="h-5 w-20 bg-gray-200 rounded-md animate-pulse" />
        <div className="h-3 w-16 bg-gray-100 rounded-md animate-pulse" />
      </div>
    </div>
  )
}

export default function ClaimsPage() {
  const { claims, loading, total, totalPages, filters, setFilters, fetchClaims } = useClaimsStore()
  const [searchInput, setSearchInput] = useState(filters.search ?? '')
  const [typeOpen, setTypeOpen] = useState(false)
  const typeRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchClaims()
  }, [fetchClaims])

  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters({ search: searchInput.trim() || undefined })
    }, 300)
    return () => clearTimeout(timer)
  }, [searchInput]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (typeRef.current && !typeRef.current.contains(e.target as Node))
        setTypeOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const isFiltered = !!(filters.status || filters.type || filters.search)

  function clearFilters() {
    setFilters({ status: undefined, type: undefined, search: undefined })
    setSearchInput('')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
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
        {/* Filter bar */}
        <div className="px-4 pt-3 pb-2.5 border-b border-gray-100 space-y-2.5">
          {/* Row 1: search + type */}
          <div className="grid grid-cols-4 gap-3">
            <div className="relative col-span-3">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search by claim number..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-lg pl-9 pr-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div ref={typeRef} className="relative">
              <button
                onClick={() => setTypeOpen((o) => !o)}
                className="w-full flex items-center gap-2 text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors"
              >
                {filters.type ? (
                  <ClaimTypeIcon type={filters.type as ClaimType} />
                ) : (
                  <span className="text-gray-500">All Types</span>
                )}
                <svg
                  className={`ml-auto w-3.5 h-3.5 text-gray-400 transition-transform ${typeOpen ? 'rotate-180' : ''}`}
                  viewBox="0 0 12 12" fill="none"
                >
                  <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>

              {typeOpen && (
                <div className="absolute z-20 mt-1.5 left-0 right-0 bg-white border border-gray-100 rounded-xl shadow-lg py-1">
                  <button
                    onClick={() => { setFilters({ type: undefined }); setTypeOpen(false) }}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 transition-colors ${!filters.type ? 'bg-gray-50' : ''}`}
                  >
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-500">
                      All Types
                    </span>
                  </button>
                  {(Object.entries(TYPE_ICON_CONFIG) as [ClaimType, typeof TYPE_ICON_CONFIG[ClaimType]][]).map(([key, cfg]) => (
                    <button
                      key={key}
                      onClick={() => { setFilters({ type: key }); setTypeOpen(false) }}
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

          {/* Row 2: status pills */}
          <div className="flex gap-1.5 overflow-x-auto pb-0.5">
            {STATUS_PILLS.map((pill) => {
              const isActive = (filters.status ?? '') === pill.value
              return (
                <button
                  key={pill.value}
                  onClick={() => setFilters({ status: (pill.value as ClaimStatus) || undefined })}
                  className={`shrink-0 text-xs font-medium px-3 py-1.5 rounded-full border transition-all ${isActive ? pill.active : pill.inactive}`}
                >
                  {pill.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Claim list */}
        {loading ? (
          <div className="p-4 grid grid-cols-1 lg:grid-cols-2 gap-3">
            {[...Array(6)].map((_, i) => <ClaimCardSkeleton key={i} />)}
          </div>
        ) : claims.length === 0 ? (
          <div className="py-16 flex flex-col items-center text-center gap-3">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-600">
                {isFiltered ? 'No claims match your filters' : 'No claims yet'}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {isFiltered ? (
                  <button onClick={clearFilters} className="text-primary font-medium hover:underline">
                    Clear filters
                  </button>
                ) : (
                  <>
                    <Link href="/claims/new" className="text-primary font-medium hover:underline">
                      File your first claim
                    </Link>
                    {' '}to get started.
                  </>
                )}
              </p>
            </div>
          </div>
        ) : (
          <div className="p-4 grid grid-cols-1 lg:grid-cols-2 gap-3">
            {claims.map((claim) => (
              <ClaimCard key={String(claim._id)} claim={claim} />
            ))}
          </div>
        )}

        {/* Pagination */}
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
