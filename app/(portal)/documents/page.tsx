import { Metadata } from 'next'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import DocumentModel from '@/models/Document'
import Claim from '@/models/Claim'
import { Card } from '@/components/ui/Card'
import { IDocument, IClaim } from '@/types'

export const metadata: Metadata = { title: 'Documents' }

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(d: Date | string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default async function DocumentsPage() {
  const session = await auth()
  await connectDB()

  const userClaims = await Claim.find({ claimantId: session!.user.id }).select('_id claimNumber').lean() as unknown as IClaim[]
  const claimIds = userClaims.map((c) => c._id)
  const claimMap = Object.fromEntries(userClaims.map((c) => [String(c._id), c.claimNumber]))

  const documents = await DocumentModel.find({ claimId: { $in: claimIds } })
    .sort({ uploadedAt: -1 })
    .lean() as unknown as IDocument[]

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-gray-900">Documents</h1>
        <p className="text-sm text-gray-500 mt-1">{documents.length} document{documents.length !== 1 ? 's' : ''} across all claims</p>
      </div>

      <Card>
        {documents.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-gray-400 text-sm">No documents yet. Upload documents when filing a claim.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {documents.map((doc) => (
              <div key={String(doc._id)} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors">
                <div className="w-10 h-10 flex items-center justify-center bg-gray-100 rounded-lg text-xs font-bold text-gray-500 uppercase">
                  {doc.fileType === 'application/pdf' ? 'PDF' : doc.fileType.includes('png') ? 'PNG' : 'JPG'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{doc.fileName}</p>
                  <p className="text-xs text-gray-400">
                    {claimMap[String(doc.claimId)] ?? 'Unknown claim'} · {formatSize(doc.fileSize)} · {formatDate(doc.uploadedAt)}
                  </p>
                </div>
                <a
                  href={`/api/documents/${doc._id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary font-medium hover:underline shrink-0"
                >
                  View
                </a>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
