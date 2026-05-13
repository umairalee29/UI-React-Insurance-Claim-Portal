import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import Claim from '@/models/Claim'
import User from '@/models/User'
import { assignClaimSchema } from '@/lib/validations'
import { createAuditLog } from '@/lib/auditLog'
import { sendEmail } from '@/lib/mailer'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
    if (!['adjuster', 'manager'].includes(session.user.role)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const parsed = assignClaimSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0].message },
        { status: 400 }
      )
    }

    await connectDB()

    const [claim, adjuster] = await Promise.all([
      Claim.findById(parsed.data.claimId),
      User.findById(parsed.data.adjusterId),
    ])

    if (!claim) {
      return NextResponse.json({ success: false, error: 'Claim not found' }, { status: 404 })
    }
    if (!adjuster || !['adjuster', 'manager'].includes(adjuster.role)) {
      return NextResponse.json({ success: false, error: 'Invalid adjuster' }, { status: 400 })
    }

    claim.assignedAdjusterId = adjuster._id
    if (claim.status === 'submitted') {
      claim.status = 'under_review'
      claim.statusHistory.push({
        status: 'under_review',
        changedBy: session.user.id as unknown as import('mongoose').Types.ObjectId,
        changedAt: new Date(),
        note: `Assigned to ${adjuster.name}`,
      })
    }
    await claim.save()

    await sendEmail(
      adjuster.email,
      `New Claim Assigned: ${claim.claimNumber}`,
      `<p>Claim <strong>${claim.claimNumber}</strong> has been assigned to you for review.</p>
       <p><a href="${process.env.NEXTAUTH_URL}/adjuster/${claim._id}">Review Claim</a></p>`
    )

    await createAuditLog(
      'CLAIM_ASSIGNED',
      session.user.id,
      claim._id.toString(),
      'Claim',
      { adjusterId: adjuster._id.toString(), adjusterName: adjuster.name }
    )

    return NextResponse.json({ success: true, data: claim })
  } catch (err) {
    console.error('[POST /api/admin/assign]', err)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
