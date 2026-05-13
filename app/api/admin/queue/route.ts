import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import Claim from '@/models/Claim'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
    if (session.user.role === 'claimant') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    await connectDB()

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const type = searchParams.get('type')
    const search = searchParams.get('search')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const sortBy = searchParams.get('sortBy') ?? 'createdAt'
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? 1 : -1
    const page = Math.max(1, Number(searchParams.get('page') ?? 1))
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') ?? 25)))

    const query: Record<string, unknown> = {}
    if (status) query.status = status
    if (type) query.type = type
    if (dateFrom || dateTo) {
      query.createdAt = {}
      if (dateFrom) (query.createdAt as Record<string, Date>).$gte = new Date(dateFrom)
      if (dateTo) (query.createdAt as Record<string, Date>).$lte = new Date(dateTo)
    }

    const validSortFields = ['createdAt', 'estimatedAmount', 'status', 'type']
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt'

    let claims = Claim.find(query)
      .populate('claimantId', 'name email')
      .populate('assignedAdjusterId', 'name email')
      .sort({ [sortField]: sortOrder })

    if (search) {
      const allClaims = await claims.lean()
      const filtered = allClaims.filter((c) => {
        const claimant = c.claimantId as unknown as { name: string; email: string } | null
        return (
          c.claimNumber?.toLowerCase().includes(search.toLowerCase()) ||
          claimant?.name?.toLowerCase().includes(search.toLowerCase()) ||
          claimant?.email?.toLowerCase().includes(search.toLowerCase())
        )
      })
      const total = filtered.length
      const paginated = filtered.slice((page - 1) * limit, page * limit)
      return NextResponse.json({
        success: true,
        data: paginated,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      })
    }

    const [data, total] = await Promise.all([
      claims.skip((page - 1) * limit).limit(limit).lean(),
      Claim.countDocuments(query),
    ])

    return NextResponse.json({
      success: true,
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    })
  } catch (err) {
    console.error('[GET /api/admin/queue]', err)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
