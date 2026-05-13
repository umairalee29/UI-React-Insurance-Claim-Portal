import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import DocumentModel from '@/models/Document'
import Claim from '@/models/Claim'
import { createAuditLog } from '@/lib/auditLog'
import path from 'path'
import fs from 'fs/promises'

const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']
const MAX_SIZE = 10 * 1024 * 1024 // 10MB

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const claimId = formData.get('claimId') as string | null

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 })
    }
    if (!claimId) {
      return NextResponse.json({ success: false, error: 'claimId is required' }, { status: 400 })
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid file type. Only PDF, JPG, and PNG are allowed.' },
        { status: 400 }
      )
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { success: false, error: 'File too large. Maximum size is 10MB.' },
        { status: 400 }
      )
    }

    await connectDB()

    const claim = await Claim.findById(claimId)
    if (!claim) {
      return NextResponse.json({ success: false, error: 'Claim not found' }, { status: 404 })
    }

    if (
      session.user.role === 'claimant' &&
      claim.claimantId.toString() !== session.user.id
    ) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const uploadDir = process.env.UPLOAD_DIR
      ? path.resolve(process.env.UPLOAD_DIR)
      : path.join(process.cwd(), 'uploads')

    await fs.mkdir(uploadDir, { recursive: true })

    const ext = path.extname(file.name)
    const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`
    const filePath = path.join(uploadDir, uniqueName)

    await fs.writeFile(filePath, buffer)

    const doc = await DocumentModel.create({
      claimId,
      uploadedBy: session.user.id,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      filePath: uniqueName,
      uploadedAt: new Date(),
    })

    await Claim.findByIdAndUpdate(claimId, {
      $addToSet: { documents: doc._id },
    })

    await createAuditLog(
      'DOCUMENT_UPLOADED',
      session.user.id,
      doc._id.toString(),
      'Document',
      { claimId, fileName: file.name, fileSize: file.size }
    )

    return NextResponse.json({ success: true, data: doc }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/documents/upload]', err)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
