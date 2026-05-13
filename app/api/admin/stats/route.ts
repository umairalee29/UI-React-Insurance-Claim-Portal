import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import Claim from '@/models/Claim'

export async function GET(_request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
    if (session.user.role === 'claimant') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    await connectDB()

    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const [byStatus, byType, thisMonth, approvedClaims] = await Promise.all([
      Claim.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Claim.aggregate([{ $group: { _id: '$type', count: { $sum: 1 } } }]),
      Claim.countDocuments({ createdAt: { $gte: startOfMonth } }),
      Claim.find({ status: 'approved', approvedAmount: { $exists: true, $ne: null } })
        .select('estimatedAmount approvedAmount createdAt updatedAt')
        .lean(),
    ])

    const totalApproved = approvedClaims.reduce((sum, c) => sum + (c.approvedAmount ?? 0), 0)
    const totalEstimated = approvedClaims.reduce((sum, c) => sum + c.estimatedAmount, 0)

    const avgProcessingDays =
      approvedClaims.length > 0
        ? approvedClaims.reduce((sum, c) => {
            const days = Math.round(
              (c.updatedAt.getTime() - c.createdAt.getTime()) / (1000 * 60 * 60 * 24)
            )
            return sum + days
          }, 0) / approvedClaims.length
        : 0

    const statusMap = Object.fromEntries(byStatus.map((s) => [s._id, s.count]))
    const typeMap = Object.fromEntries(byType.map((t) => [t._id, t.count]))

    return NextResponse.json({
      success: true,
      data: {
        byStatus: statusMap,
        byType: typeMap,
        thisMonth,
        totalApproved,
        totalEstimated,
        avgProcessingDays: Math.round(avgProcessingDays),
        total: (Object.values(statusMap) as number[]).reduce((a, b) => a + b, 0),
      },
    })
  } catch (err) {
    console.error('[GET /api/admin/stats]', err)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
