'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { IClaim, IUser, IDocument } from '@/types'
import { ClaimStatusBadge } from '@/components/claims/ClaimStatusBadge'
import { ClaimTypeIcon } from '@/components/claims/ClaimTypeIcon'
import { StatusTimeline } from '@/components/claims/StatusTimeline'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Input'
import { Skeleton } from '@/components/ui/Skeleton'

interface PopulatedClaim extends Omit<IClaim, 'claimantId' | 'assignedAdjusterId' | 'documents'> {
  claimantId: IUser
  assignedAdjusterId: IUser | null
  documents: IDocument[]
}

const NEXT_STATUSES: Record<string, string[]> = {
  submitted: ['under_review', 'rejected'],
  under_review: ['approved', 'rejected', 'closed'],
  approved: ['closed'],
  rejected: ['under_review', 'closed'],
  draft: ['submitted'],
  closed: [],
}

const STATUS_OPTIONS: Record<string, {
  label: string
  dot: string
  selectedBorder: string
  selectedBg: string
  selectedText: string
  iconBg: string
  icon: React.ReactNode
}> = {
  submitted: {
    label: 'Submitted',
    dot: 'bg-blue-500',
    selectedBorder: 'border-blue-500',
    selectedBg: 'bg-blue-50',
    selectedText: 'text-blue-700',
    iconBg: 'bg-blue-100',
    icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />,
  },
  under_review: {
    label: 'Under Review',
    dot: 'bg-amber-500',
    selectedBorder: 'border-amber-500',
    selectedBg: 'bg-amber-50',
    selectedText: 'text-amber-700',
    iconBg: 'bg-amber-100',
    icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />,
  },
  approved: {
    label: 'Approved',
    dot: 'bg-green-500',
    selectedBorder: 'border-green-500',
    selectedBg: 'bg-green-50',
    selectedText: 'text-green-700',
    iconBg: 'bg-green-100',
    icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />,
  },
  rejected: {
    label: 'Rejected',
    dot: 'bg-red-500',
    selectedBorder: 'border-red-500',
    selectedBg: 'bg-red-50',
    selectedText: 'text-red-700',
    iconBg: 'bg-red-100',
    icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />,
  },
  closed: {
    label: 'Closed',
    dot: 'bg-purple-500',
    selectedBorder: 'border-purple-500',
    selectedBg: 'bg-purple-50',
    selectedText: 'text-purple-700',
    iconBg: 'bg-purple-100',
    icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />,
  },
  draft: {
    label: 'Draft',
    dot: 'bg-gray-400',
    selectedBorder: 'border-gray-400',
    selectedBg: 'bg-gray-50',
    selectedText: 'text-gray-700',
    iconBg: 'bg-gray-100',
    icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />,
  },
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}
function formatDate(d: Date | string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}
function formatSize(b: number) {
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / (1024 * 1024)).toFixed(1)} MB`
}

export default function ClaimReviewPage({ params }: { params: { claimId: string } }) {
  const [claim, setClaim] = useState<PopulatedClaim | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'details' | 'documents' | 'audit'>('details')

  const [newStatus, setNewStatus] = useState('')
  const [note, setNote] = useState('')
  const [approvedAmount, setApprovedAmount] = useState('')
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/claims/${params.claimId}`)
      const json = await res.json()
      if (json.success) {
        setClaim(json.data)
        setNewStatus((NEXT_STATUSES[json.data.status] ?? [])[0] ?? '')
      }
      setLoading(false)
    }
    load()
  }, [params.claimId])

  async function updateStatus() {
    if (!newStatus || !note.trim()) {
      toast.error('Status and note are required')
      return
    }
    setUpdating(true)
    const body: Record<string, unknown> = { status: newStatus, note }
    if (newStatus === 'approved' && approvedAmount) {
      body.approvedAmount = Number(approvedAmount)
    }
    const res = await fetch(`/api/claims/${params.claimId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const json = await res.json()
    setUpdating(false)

    if (json.success) {
      toast.success('Claim status updated')
      setClaim(json.data)
      setNote('')
      setNewStatus((NEXT_STATUSES[json.data.status] ?? [])[0] ?? '')
    } else {
      toast.error(json.error ?? 'Update failed')
    }
  }

  if (loading) {
    return (
      <div className="max-w-6xl space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-48 rounded-xl" />
            <Skeleton className="h-32 rounded-xl" />
          </div>
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    )
  }

  if (!claim) {
    return <div className="text-center py-12 text-gray-400">Claim not found.</div>
  }

  const nextOptions = NEXT_STATUSES[claim.status] ?? []

  return (
    <div className="w-full space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/adjuster/queue" className="hover:text-primary transition-colors">Claim Queue</Link>
        <svg className="w-3.5 h-3.5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-gray-800 font-medium">{claim.claimNumber}</span>
      </div>

      {/* Hero banner */}
      <div className="rounded-xl bg-gradient-to-br from-primary to-primary/75 p-6 text-white">
        <div className="flex items-start justify-between gap-6 flex-wrap">
          {/* Left: identity */}
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-heading font-bold text-white leading-tight">{claim.claimNumber}</h1>
              <div className="flex items-center gap-2.5 mt-2">
                <ClaimTypeIcon type={claim.type} />
                <ClaimStatusBadge status={claim.status} />
              </div>
            </div>
          </div>

          {/* Right: financials */}
          <div className="text-right">
            <p className="text-xs text-white/60 uppercase tracking-wide font-medium">Estimated Amount</p>
            <p className="text-3xl font-bold text-white mt-0.5">{formatCurrency(claim.estimatedAmount)}</p>
            {claim.approvedAmount != null && (
              <div className="flex items-center gap-1.5 mt-1.5 justify-end">
                <svg className="w-4 h-4 text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-sm font-semibold text-green-300">
                  Approved {formatCurrency(claim.approvedAmount)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Metadata strip */}
        <div className="mt-5 pt-4 border-t border-white/10 flex items-center gap-6 flex-wrap">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-white/50 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="text-sm text-white/70">{claim.claimantId.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-white/50 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-sm text-white/70">Filed {formatDate(claim.createdAt)}</span>
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-white/50 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm text-white/70">Incident {formatDate(claim.incidentDate)}</span>
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-white/50 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span className="text-sm text-white/70">
              {claim.assignedAdjusterId ? claim.assignedAdjusterId.name : <span className="text-white/40 italic">Unassigned</span>}
            </span>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <div className="flex border-b border-gray-100">
              {([
                { key: 'details' as const, label: 'Claim Details', count: undefined },
                { key: 'documents' as const, label: 'Documents', count: claim.documents.length },
                { key: 'audit' as const, label: 'Audit History', count: undefined },
              ]).map(({ key, label, count }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={[
                    'flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors',
                    activeTab === key
                      ? 'text-primary border-b-2 border-primary'
                      : 'text-gray-500 hover:text-gray-700',
                  ].join(' ')}
                >
                  {label}
                  {count !== undefined && count > 0 && (
                    <span className={`text-xs rounded-full px-1.5 py-0.5 font-semibold ${activeTab === key ? 'bg-primary/10 text-primary' : 'bg-gray-100 text-gray-500'}`}>
                      {count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {activeTab === 'details' && (
              <div className="px-6 py-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-400 uppercase">Claimant</p>
                    <p className="text-sm font-medium text-gray-900 mt-0.5">{claim.claimantId.name}</p>
                    <p className="text-xs text-gray-400">{claim.claimantId.email}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 uppercase">Assigned To</p>
                    <p className="text-sm font-medium text-gray-900 mt-0.5">
                      {claim.assignedAdjusterId ? claim.assignedAdjusterId.name : <span className="text-gray-400">Unassigned</span>}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 uppercase">Filed On</p>
                    <p className="text-sm font-medium text-gray-900 mt-0.5">{formatDate(claim.createdAt)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 uppercase">Incident Date</p>
                    <p className="text-sm font-medium text-gray-900 mt-0.5">{formatDate(claim.incidentDate)}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-gray-400 uppercase">Description</p>
                    <p className="text-sm text-gray-700 mt-1 leading-relaxed">{claim.incidentDescription}</p>
                  </div>
                </div>

              </div>
            )}

            {activeTab === 'documents' && (
              claim.documents.length === 0 ? (
                <div className="px-6 py-10 flex flex-col items-center text-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center">
                    <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <p className="text-sm text-gray-400">No documents attached to this claim.</p>
                </div>
              ) : (
                <div className="px-6 py-4 space-y-2">
                  {claim.documents.map((doc) => {
                    const isPdf = doc.fileType === 'application/pdf'
                    return (
                      <div key={String(doc._id)} className="flex items-center gap-3 p-3 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors group">
                        <div className={`w-10 h-10 flex items-center justify-center rounded-lg shrink-0 ${isPdf ? 'bg-red-100' : 'bg-blue-100'}`}>
                          {isPdf ? (
                            <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                          ) : (
                            <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{doc.fileName}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{isPdf ? 'PDF Document' : 'Image'} · {formatSize(doc.fileSize)}</p>
                        </div>
                        <a
                          href={`/api/documents/${doc._id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-xs font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity hover:underline shrink-0"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                          Open
                        </a>
                      </div>
                    )
                  })}
                </div>
              )
            )}

            {activeTab === 'audit' && (
              <div className="px-6 py-4">
                <p className="text-sm text-gray-400 text-center py-4">
                  Audit logs are tracked server-side. Check your MongoDB AuditLog collection for entries with targetId: {String(claim._id)}.
                </p>
              </div>
            )}
          </Card>

          <Card title="Status Timeline">
            <div className="px-6 py-4">
              <StatusTimeline history={claim.statusHistory ?? []} />
            </div>
          </Card>
        </div>

        <div className="space-y-4 sticky top-24 self-start">
          {nextOptions.length > 0 && (
            <Card title="Update Status">
              <div className="px-6 py-4 space-y-4">
                {/* From → To transition strip */}
                <div className="bg-gray-50 rounded-xl px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-400 font-medium mb-1">From</p>
                      <ClaimStatusBadge status={claim.status} />
                    </div>
                    <svg className="w-5 h-5 text-gray-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                    <div className="flex-1 min-w-0 text-right">
                      <p className="text-xs text-gray-400 font-medium mb-1">To</p>
                      {newStatus
                        ? <ClaimStatusBadge status={newStatus as import('@/types').ClaimStatus} />
                        : <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border-2 border-dashed border-gray-200 text-gray-300">Select...</span>
                      }
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 mt-2.5">Updated {formatDate(claim.updatedAt)}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Select Next Action</label>
                  <div className="space-y-2">
                    {nextOptions.map((s) => {
                      const cfg = STATUS_OPTIONS[s]
                      if (!cfg) return null
                      const isSelected = newStatus === s
                      return (
                        <button
                          key={s}
                          onClick={() => setNewStatus(s)}
                          className={[
                            'w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all',
                            isSelected
                              ? `${cfg.selectedBorder} ${cfg.selectedBg}`
                              : 'border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50',
                          ].join(' ')}
                        >
                          <div className={[
                            'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all',
                            isSelected ? cfg.iconBg : 'bg-gray-100',
                          ].join(' ')}>
                            <svg className={`w-4 h-4 ${isSelected ? cfg.selectedText : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              {cfg.icon}
                            </svg>
                          </div>
                          <span className={`text-sm font-semibold ${isSelected ? cfg.selectedText : 'text-gray-600'}`}>
                            {cfg.label}
                          </span>
                          {isSelected && (
                            <div className={`ml-auto w-5 h-5 rounded-full flex items-center justify-center ${cfg.dot}`}>
                              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {newStatus === 'approved' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Approved Amount (USD)</label>
                    <input
                      type="number"
                      value={approvedAmount}
                      onChange={(e) => setApprovedAmount(e.target.value)}
                      placeholder={String(claim.estimatedAmount)}
                      className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Adjuster Note <span className="text-red-500">*</span>
                  </label>
                  <Textarea
                    id="adjuster-note"
                    placeholder="Add a note explaining this status change..."
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={3}
                  />
                </div>

                <Button onClick={updateStatus} loading={updating} className="w-full">
                  {{
                    approved: 'Approve Claim',
                    rejected: 'Reject Claim',
                    under_review: 'Move to Review',
                    closed: 'Close Claim',
                    submitted: 'Submit Claim',
                    draft: 'Save as Draft',
                  }[newStatus] ?? 'Update Status'}
                </Button>
              </div>
            </Card>
          )}

          {nextOptions.length === 0 && (
            <Card>
              <div className="px-6 py-5 flex flex-col items-center text-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                  <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <div>
                  <ClaimStatusBadge status={claim.status} />
                  <p className="text-sm text-gray-500 mt-2">This claim is in a final state and cannot be updated further.</p>
                  <p className="text-xs text-gray-400 mt-1">Last updated {formatDate(claim.updatedAt)}</p>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
