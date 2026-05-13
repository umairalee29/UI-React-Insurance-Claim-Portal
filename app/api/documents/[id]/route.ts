import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import DocumentModel from '@/models/Document'
import { createAuditLog } from '@/lib/auditLog'
import path from 'path'
import fs from 'fs/promises'
import { createReadStream, existsSync } from 'fs'
import { Readable } from 'stream'

type RouteContext = { params: { id: string } }

const MIME_TYPES: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
}

export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()

    const doc = await DocumentModel.findById(params.id).lean()
    if (!doc) {
      return NextResponse.json({ success: false, error: 'Document not found' }, { status: 404 })
    }

    const uploadDir = process.env.UPLOAD_DIR
      ? path.resolve(process.env.UPLOAD_DIR)
      : path.join(process.cwd(), 'uploads')

    const filePath = path.join(uploadDir, doc.filePath)

    if (!existsSync(filePath)) {
      return NextResponse.json({ success: false, error: 'File not found on disk' }, { status: 404 })
    }

    const ext = path.extname(doc.filePath).toLowerCase()
    const contentType = MIME_TYPES[ext] ?? 'application/octet-stream'

    const stream = createReadStream(filePath)
    const webStream = Readable.toWeb(stream) as ReadableStream

    return new NextResponse(webStream, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="${doc.fileName}"`,
        'Content-Length': String(doc.fileSize),
      },
    })
  } catch (err) {
    console.error('[GET /api/documents/[id]]', err)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()

    const doc = await DocumentModel.findById(params.id)
    if (!doc) {
      return NextResponse.json({ success: false, error: 'Document not found' }, { status: 404 })
    }

    if (
      session.user.role === 'claimant' &&
      doc.uploadedBy.toString() !== session.user.id
    ) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const uploadDir = process.env.UPLOAD_DIR
      ? path.resolve(process.env.UPLOAD_DIR)
      : path.join(process.cwd(), 'uploads')

    const filePath = path.join(uploadDir, doc.filePath)

    try {
      await fs.unlink(filePath)
    } catch {
      console.warn('[Documents] File not found on disk during delete:', filePath)
    }

    await DocumentModel.findByIdAndDelete(params.id)

    await createAuditLog(
      'DOCUMENT_DELETED',
      session.user.id,
      params.id,
      'Document',
      { fileName: doc.fileName }
    )

    return NextResponse.json({ success: true, message: 'Document deleted' })
  } catch (err) {
    console.error('[DELETE /api/documents/[id]]', err)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
