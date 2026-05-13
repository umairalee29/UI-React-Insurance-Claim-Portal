'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { IClaim, IUser, IDocument, IAuditLog } from '@/types'
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
  const router = useRouter()
  const [claim, setClaim] = useState<PopulatedClaim | null>(null)
  const [auditLogs, setAuditLogs] = useState<IAuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'details' | 'audit'>('details')

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
    <div className="max-w-6xl space-y-6">
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/adjuster/queue" className="hover:text-primary transition-colors">Claim Queue</Link>
        <span>/</span>
        <span className="text-gray-800 font-medium">{claim.claimNumber}</span>
      </div>

      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold text-gray-900">{claim.claimNumber}</h1>
          <div className="flex items-center gap-3 mt-2">
            <ClaimTypeIcon type={claim.type} />
            <ClaimStatusBadge status={claim.status} />
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500">Estimated</p>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(claim.estimatedAmount)}</p>
          {claim.approvedAmount != null && (
            <p className="text-sm text-success font-medium">Approved: {formatCurrency(claim.approvedAmount)}</p>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <div className="flex border-b border-gray-100">
              {(['details', 'audit'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={[
                    'px-6 py-3 text-sm font-medium capitalize transition-colors',
                    activeTab === tab
                      ? 'text-primary border-b-2 border-primary'
                      : 'text-gray-500 hover:text-gray-700',
                  ].join(' ')}
                >
                  {tab === 'audit' ? 'Audit History' : 'Claim Details'}
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

                {claim.documents.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-400 uppercase mb-2">Documents ({claim.documents.length})</p>
                    <div className="space-y-2">
                      {claim.documents.map((doc) => (
                        <div key={String(doc._id)} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                          <div className="w-9 h-9 flex items-center justify-center bg-white border border-gray-100 rounded text-xs font-bold text-gray-500 uppercase">
                            {doc.fileType === 'application/pdf' ? 'PDF' : 'IMG'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800 truncate">{doc.fileName}</p>
                            <p className="text-xs text-gray-400">{formatSize(doc.fileSize)}</p>
                          </div>
                          <a
                            href={`/api/documents/${doc._id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary font-medium hover:underline"
                          >
                            View
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
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

        <div className="space-y-4">
          {nextOptions.length > 0 && (
            <Card title="Update Status">
              <div className="px-6 py-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">New Status</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    {nextOptions.map((s) => (
                      <option key={s} value={s}>{s.replace('_', ' ')}</option>
                    ))}
                  </select>
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

                <Textarea
                  label="Note (required)"
                  placeholder="Add a note explaining this status change..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                />

                <Button onClick={updateStatus} loading={updating} className="w-full">
                  Update Status
                </Button>
              </div>
            </Card>
          )}

          {nextOptions.length === 0 && (
            <Card>
              <div className="px-6 py-4 text-center">
                <p className="text-sm text-gray-400">This claim is in a final state and cannot be updated further.</p>
              </div>
            </Card>
          )}

          <Card title="Current Status">
            <div className="px-6 py-4">
              <ClaimStatusBadge status={claim.status} />
              <p className="text-xs text-gray-400 mt-2">
                Last updated: {formatDate(claim.updatedAt)}
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
