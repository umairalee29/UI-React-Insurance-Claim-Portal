import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import AuditLog from '@/models/AuditLog'
import User from '@/models/User'

type RouteContext = { params: { id: string } }

export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const session = await auth()
    if (!session || session.user.role === 'claimant') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()

    const logs = await AuditLog.find({ targetId: params.id, targetModel: 'Claim' })
      .sort({ createdAt: -1 })
      .lean()

    const userIds = [...new Set(logs.map((l) => String(l.performedBy)))]
    const users = await User.find({ _id: { $in: userIds } }).select('name email').lean()
    const userMap = Object.fromEntries(users.map((u) => [String(u._id), u]))

    const data = logs.map((log) => ({
      ...log,
      _id: String(log._id),
      performedBy: userMap[String(log.performedBy)] ?? { name: 'Unknown', email: '' },
    }))

    return NextResponse.json({ success: true, data })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
