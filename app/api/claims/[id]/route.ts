import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import Claim from '@/models/Claim'
import User from '@/models/User'
import { updateClaimSchema } from '@/lib/validations'
import { createAuditLog } from '@/lib/auditLog'
import { sendEmail, claimStatusEmail } from '@/lib/mailer'

type RouteContext = { params: { id: string } }

export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()

    const claim = await Claim.findById(params.id)
      .populate('claimantId', 'name email')
      .populate('assignedAdjusterId', 'name email')
      .populate('documents')
      .lean()

    if (!claim) {
      return NextResponse.json({ success: false, error: 'Claim not found' }, { status: 404 })
    }

    const claimantId = typeof claim.claimantId === 'object' && '_id' in claim.claimantId
      ? (claim.claimantId as { _id: { toString: () => string } })._id.toString()
      : claim.claimantId?.toString()

    if (session.user.role === 'claimant' && claimantId !== session.user.id) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json({ success: true, data: claim })
  } catch (err) {
    console.error('[GET /api/claims/[id]]', err)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
    if (session.user.role === 'claimant') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const parsed = updateClaimSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0].message },
        { status: 400 }
      )
    }

    await connectDB()

    const claim = await Claim.findById(params.id).populate('claimantId', 'email name')
    if (!claim) {
      return NextResponse.json({ success: false, error: 'Claim not found' }, { status: 404 })
    }

    const previousStatus = claim.status
    claim.status = parsed.data.status
    if (parsed.data.approvedAmount !== undefined) {
      claim.approvedAmount = parsed.data.approvedAmount
    }
    claim.statusHistory.push({
      status: parsed.data.status,
      changedBy: session.user.id as unknown as import('mongoose').Types.ObjectId,
      changedAt: new Date(),
      note: parsed.data.note,
    })

    await claim.save()

    const claimant = claim.claimantId as unknown as { email: string; name: string }
    if (claimant?.email) {
      await sendEmail(
        claimant.email,
        `Claim ${claim.claimNumber} Status Updated`,
        claimStatusEmail(claim.claimNumber, parsed.data.status, parsed.data.note)
      )
    }

    await createAuditLog(
      'CLAIM_STATUS_UPDATED',
      session.user.id,
      claim._id.toString(),
      'Claim',
      { previousStatus, newStatus: parsed.data.status, note: parsed.data.note }
    )

    return NextResponse.json({ success: true, data: claim })
  } catch (err) {
    console.error('[PATCH /api/claims/[id]]', err)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
    if (session.user.role !== 'manager') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    await connectDB()

    const claim = await Claim.findById(params.id)
    if (!claim) {
      return NextResponse.json({ success: false, error: 'Claim not found' }, { status: 404 })
    }

    claim.status = 'closed'
    claim.statusHistory.push({
      status: 'closed',
      changedBy: session.user.id as unknown as import('mongoose').Types.ObjectId,
      changedAt: new Date(),
      note: 'Claim closed by manager',
    })
    await claim.save()

    await createAuditLog(
      'CLAIM_CLOSED',
      session.user.id,
      claim._id.toString(),
      'Claim',
      {}
    )

    return NextResponse.json({ success: true, message: 'Claim closed successfully' })
  } catch (err) {
    console.error('[DELETE /api/claims/[id]]', err)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
