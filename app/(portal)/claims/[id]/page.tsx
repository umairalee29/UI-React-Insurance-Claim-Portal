import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import Claim from '@/models/Claim'
import { ClaimStatusBadge } from '@/components/claims/ClaimStatusBadge'
import { ClaimTypeIcon } from '@/components/claims/ClaimTypeIcon'
import { StatusTimeline } from '@/components/claims/StatusTimeline'
import { Card } from '@/components/ui/Card'
import { IDocument, IUser } from '@/types'

export const metadata: Metadata = { title: 'Claim Details' }

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

function formatDate(d: Date | string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

type Props = { params: { id: string } }

export default async function ClaimDetailPage({ params }: Props) {
  const session = await auth()
  await connectDB()

  const claim = await Claim.findById(params.id)
    .populate('claimantId', 'name email')
    .populate('assignedAdjusterId', 'name email')
    .populate('documents')
    .lean()

  if (!claim) notFound()

  const claimant = claim.claimantId as unknown as IUser
  if (claimant._id.toString() !== session!.user.id) notFound()

  const adjuster = claim.assignedAdjusterId as unknown as IUser | null
  const documents = claim.documents as unknown as IDocument[]

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/claims" className="hover:text-primary transition-colors">My Claims</Link>
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
          <p className="text-sm text-gray-500">Estimated Amount</p>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(claim.estimatedAmount)}</p>
          {claim.approvedAmount != null && (
            <p className="text-sm text-success font-medium mt-0.5">
              Approved: {formatCurrency(claim.approvedAmount)}
            </p>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card title="Claim Information">
            <div className="px-6 py-4 grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider">Filed On</p>
                <p className="text-sm font-medium text-gray-900 mt-0.5">{formatDate(claim.createdAt)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider">Incident Date</p>
                <p className="text-sm font-medium text-gray-900 mt-0.5">{formatDate(claim.incidentDate)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider">Assigned To</p>
                <p className="text-sm font-medium text-gray-900 mt-0.5">
                  {adjuster ? adjuster.name : <span className="text-gray-400">Unassigned</span>}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider">Claimant</p>
                <p className="text-sm font-medium text-gray-900 mt-0.5">{claimant.name}</p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-gray-400 uppercase tracking-wider">Incident Description</p>
                <p className="text-sm text-gray-700 mt-1 leading-relaxed">{claim.incidentDescription}</p>
              </div>
            </div>
          </Card>

          <Card title="Documents" description={`${documents.length} file${documents.length !== 1 ? 's' : ''} attached`}>
            <div className="px-6 py-4">
              {documents.length === 0 ? (
                <p className="text-sm text-gray-400">No documents uploaded yet.</p>
              ) : (
                <ul className="space-y-2">
                  {documents.map((doc) => (
                    <li key={String(doc._id)} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="w-9 h-9 flex items-center justify-center bg-white border border-gray-100 rounded-lg text-xs font-bold text-gray-500 uppercase">
                        {doc.fileType === 'application/pdf' ? 'PDF' : doc.fileType.includes('png') ? 'PNG' : 'JPG'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{doc.fileName}</p>
                        <p className="text-xs text-gray-400">{formatSize(doc.fileSize)}</p>
                      </div>
                      <a
                        href={`/api/documents/${doc._id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary font-medium hover:underline shrink-0"
                      >
                        Download
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>
        </div>

        <div>
          <Card title="Status History">
            <div className="px-6 py-4">
              <StatusTimeline history={claim.statusHistory ?? []} />
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
