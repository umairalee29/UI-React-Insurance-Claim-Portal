'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ClaimType, ClaimStatus, IStatusHistoryEntry } from '@/types'
import { ClaimStatusBadge } from '@/components/claims/ClaimStatusBadge'
import { ClaimTypeIcon } from '@/components/claims/ClaimTypeIcon'
import { StatusTimeline } from '@/components/claims/StatusTimeline'

interface DrawerClaim {
  _id: string
  claimNumber: string
  type: ClaimType
  status: ClaimStatus
  claimantId: { _id: string; name: string; email: string }
  assignedAdjusterId: { _id: string; name: string; email: string } | null
  incidentDate: string
  createdAt: string
  estimatedAmount: number
  approvedAmount: number | null
  incidentDescription: string
  statusHistory: IStatusHistoryEntry[]
  documents: Array<{ _id: string; fileName: string; fileType: string; fileSize: number }>
}

interface ClaimDrawerProps {
  claimId: string | null
  onClose: () => void
  currentUserId?: string
  onAssignMe?: (claim: { _id: string; claimNumber: string }) => void
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}
function fmtDate(d: string | Date) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
function fmtSize(b: number) {
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / (1024 * 1024)).toFixed(1)} MB`
}
function initials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

function FileIcon({ type }: { type: string }) {
  if (type.includes('pdf'))
    return (
      <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
        <svg className="w-4.5 h-4.5 text-red-500" viewBox="0 0 24 24" fill="currentColor">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 7V3.5L18.5 9H13zm-3 5h1v-1h-1v1zm3-1h-1v1h1v-1zM8 14h1v1H8v-1z" />
        </svg>
      </div>
    )
  if (type.includes('image'))
    return (
      <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
        <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
    )
  return (
    <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    </div>
  )
}

function SkeletonPulse({ className }: { className: string }) {
  return <div className={`bg-gray-200 rounded animate-pulse ${className}`} />
}

function DrawerSkeleton() {
  return (
    <div className="p-6 space-y-6">
      <div className="space-y-2">
        <SkeletonPulse className="h-6 w-44" />
        <div className="flex gap-2">
          <SkeletonPulse className="h-5 w-16 rounded-full" />
          <SkeletonPulse className="h-5 w-20 rounded-full" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {[...Array(4)].map((_, i) => <SkeletonPulse key={i} className="h-20 rounded-xl" />)}
      </div>
      <div className="space-y-2">
        <SkeletonPulse className="h-3.5 w-20" />
        <SkeletonPulse className="h-16 rounded-xl" />
      </div>
      <div className="space-y-2">
        <SkeletonPulse className="h-3.5 w-28" />
        <SkeletonPulse className="h-24 rounded-xl" />
      </div>
      <div className="space-y-3">
        <SkeletonPulse className="h-3.5 w-24" />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex gap-3 items-start">
            <SkeletonPulse className="w-8 h-8 rounded-full shrink-0" />
            <div className="flex-1 space-y-1.5 pt-1">
              <SkeletonPulse className="h-3.5 w-20" />
              <SkeletonPulse className="h-3 w-32" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">{children}</p>
  )
}

export function ClaimDrawer({ claimId, onClose, currentUserId, onAssignMe }: ClaimDrawerProps) {
  const [claim, setClaim] = useState<DrawerClaim | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!claimId) { setClaim(null); return }
    setLoading(true)
    setClaim(null)
    fetch(`/api/claims/${claimId}`)
      .then(r => r.json())
      .then(json => { if (json.success) setClaim(json.data) })
      .finally(() => setLoading(false))
  }, [claimId])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    if (claimId) document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [claimId, onClose])

  const isAssignedToMe = !!claim?.assignedAdjusterId && String(claim.assignedAdjusterId._id) === currentUserId

  return (
    <AnimatePresence>
      {claimId && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed top-16 inset-x-0 bottom-0 z-40 bg-black/40 backdrop-blur-[2px]"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            key="panel"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 280 }}
            className="fixed top-16 bottom-0 right-0 z-50 flex flex-col w-full max-w-[520px] bg-white shadow-2xl"
          >
            {/* Close button always visible */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
              {loading || !claim ? (
                <SkeletonPulse className="h-5 w-36" />
              ) : (
                <div>
                  <h2 className="text-base font-bold text-gray-900 font-heading leading-tight">
                    {claim.claimNumber}
                  </h2>
                  <div className="flex items-center gap-2 mt-1.5">
                    <ClaimTypeIcon type={claim.type} />
                    <ClaimStatusBadge status={claim.status} />
                  </div>
                </div>
              )}
              <button
                onClick={onClose}
                className="p-1.5 ml-4 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors shrink-0"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Body */}
            {loading || !claim ? (
              <div className="flex-1 overflow-y-auto"><DrawerSkeleton /></div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto">
                  <div className="p-6 space-y-7">

                    {/* Overview grid */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-gray-50 rounded-xl p-4">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <p className="text-xs text-gray-400 font-medium">Incident Date</p>
                        </div>
                        <p className="text-sm font-semibold text-gray-800">{fmtDate(claim.incidentDate)}</p>
                      </div>

                      <div className="bg-gray-50 rounded-xl p-4">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <p className="text-xs text-gray-400 font-medium">Filed On</p>
                        </div>
                        <p className="text-sm font-semibold text-gray-800">{fmtDate(claim.createdAt)}</p>
                      </div>

                      <div className="bg-primary/5 border border-primary/10 rounded-xl p-4">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <svg className="w-3.5 h-3.5 text-primary/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <p className="text-xs text-primary/60 font-medium">Estimated</p>
                        </div>
                        <p className="text-sm font-bold text-primary">{fmt(claim.estimatedAmount)}</p>
                      </div>

                      <div className={`rounded-xl p-4 border ${claim.approvedAmount != null ? 'bg-emerald-50 border-emerald-100' : 'bg-gray-50 border-transparent'}`}>
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <svg className={`w-3.5 h-3.5 ${claim.approvedAmount != null ? 'text-emerald-500' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <p className={`text-xs font-medium ${claim.approvedAmount != null ? 'text-emerald-600/70' : 'text-gray-400'}`}>Approved</p>
                        </div>
                        {claim.approvedAmount != null
                          ? <p className="text-sm font-bold text-emerald-700">{fmt(claim.approvedAmount)}</p>
                          : <p className="text-sm font-medium text-gray-400">Pending</p>
                        }
                      </div>
                    </div>

                    {/* Claimant */}
                    <div>
                      <SectionLabel>Claimant</SectionLabel>
                      <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-4">
                        <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center shrink-0">
                          <span className="text-white text-sm font-bold">{initials(claim.claimantId.name)}</span>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-800">{claim.claimantId.name}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{claim.claimantId.email}</p>
                        </div>
                      </div>
                    </div>

                    {/* Assignment */}
                    <div>
                      <SectionLabel>Assigned To</SectionLabel>
                      <div className="flex items-center justify-between bg-gray-50 rounded-xl p-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${claim.assignedAdjusterId ? 'bg-gray-200' : 'bg-gray-100'}`}>
                            {claim.assignedAdjusterId ? (
                              <span className="text-gray-600 text-xs font-bold">{initials(claim.assignedAdjusterId.name)}</span>
                            ) : (
                              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-800">
                              {claim.assignedAdjusterId?.name ?? 'Unassigned'}
                            </p>
                            {isAssignedToMe && (
                              <p className="text-xs text-emerald-600 font-medium mt-0.5">That's you</p>
                            )}
                          </div>
                        </div>
                        {!claim.assignedAdjusterId && onAssignMe && (
                          <button
                            onClick={() => onAssignMe({ _id: claim._id, claimNumber: claim.claimNumber })}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 hover:border-emerald-300 transition-all"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                            </svg>
                            Assign Me
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Incident Description */}
                    <div>
                      <SectionLabel>Incident Description</SectionLabel>
                      <div className="bg-gray-50 rounded-xl p-4">
                        <p className="text-sm text-gray-700 leading-relaxed">{claim.incidentDescription}</p>
                      </div>
                    </div>

                    {/* Documents */}
                    {claim.documents.length > 0 && (
                      <div>
                        <SectionLabel>
                          Documents{' '}
                          <span className="text-gray-300 normal-case font-normal tracking-normal ml-1">
                            ({claim.documents.length})
                          </span>
                        </SectionLabel>
                        <div className="space-y-2">
                          {claim.documents.map((doc) => (
                            <a
                              key={doc._id}
                              href={`/api/documents/${doc._id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-3 bg-gray-50 hover:bg-gray-100 rounded-xl p-3 transition-colors group"
                            >
                              <FileIcon type={doc.fileType} />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-800 truncate">{doc.fileName}</p>
                                <p className="text-xs text-gray-400 mt-0.5">{fmtSize(doc.fileSize)}</p>
                              </div>
                              <svg className="w-4 h-4 text-gray-300 group-hover:text-primary transition-colors shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                              </svg>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Status History */}
                    <div className="pb-2">
                      <SectionLabel>Status History</SectionLabel>
                      <StatusTimeline history={claim.statusHistory} />
                    </div>

                  </div>
                </div>

                {/* Footer CTA */}
                <div className="shrink-0 px-6 py-4 border-t border-gray-100 bg-gray-50/60">
                  <a
                    href={`/adjuster/${claim._id}`}
                    className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-semibold bg-primary text-white hover:bg-primary-700 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Open Full Review
                  </a>
                </div>
              </>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
