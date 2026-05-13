import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import Claim from '@/models/Claim'
import { createClaimSchema } from '@/lib/validations'
import { createAuditLog } from '@/lib/auditLog'
import { ClaimFilters } from '@/types'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()

    const { searchParams } = new URL(request.url)
    const filters: ClaimFilters = {
      status: searchParams.get('status') as ClaimFilters['status'] ?? undefined,
      type: searchParams.get('type') as ClaimFilters['type'] ?? undefined,
      search: searchParams.get('search') ?? undefined,
      page: Number(searchParams.get('page') ?? 1),
      limit: Number(searchParams.get('limit') ?? 25),
      dateFrom: searchParams.get('dateFrom') ?? undefined,
      dateTo: searchParams.get('dateTo') ?? undefined,
    }

    const query: Record<string, unknown> = {}

    if (session.user.role === 'claimant') {
      query.claimantId = session.user.id
    }
    if (filters.status) query.status = filters.status
    if (filters.type) query.type = filters.type
    if (filters.search) {
      query.$or = [
        { claimNumber: { $regex: filters.search, $options: 'i' } },
      ]
    }
    if (filters.dateFrom || filters.dateTo) {
      query.incidentDate = {}
      if (filters.dateFrom) (query.incidentDate as Record<string, Date>).$gte = new Date(filters.dateFrom)
      if (filters.dateTo) (query.incidentDate as Record<string, Date>).$lte = new Date(filters.dateTo)
    }

    const skip = ((filters.page ?? 1) - 1) * (filters.limit ?? 25)
    const limit = filters.limit ?? 25

    const [claims, total] = await Promise.all([
      Claim.find(query)
        .populate('claimantId', 'name email')
        .populate('assignedAdjusterId', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Claim.countDocuments(query),
    ])

    return NextResponse.json({
      success: true,
      data: claims,
      total,
      page: filters.page,
      limit,
      totalPages: Math.ceil(total / limit),
    })
  } catch (err) {
    console.error('[GET /api/claims]', err)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
    if (session.user.role !== 'claimant') {
      return NextResponse.json({ success: false, error: 'Only claimants can create claims' }, { status: 403 })
    }

    const body = await request.json()
    const parsed = createClaimSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0].message },
        { status: 400 }
      )
    }

    await connectDB()

    const claim = await Claim.create({
      claimantId: session.user.id,
      type: parsed.data.type,
      status: parsed.data.status,
      incidentDate: new Date(parsed.data.incidentDate),
      incidentDescription: parsed.data.incidentDescription,
      estimatedAmount: parsed.data.estimatedAmount,
      statusHistory: [
        {
          status: parsed.data.status,
          changedBy: session.user.id,
          changedAt: new Date(),
          note: parsed.data.status === 'submitted' ? 'Claim submitted' : 'Claim saved as draft',
        },
      ],
    })

    await createAuditLog(
      'CLAIM_CREATED',
      session.user.id,
      claim._id.toString(),
      'Claim',
      { status: parsed.data.status, type: parsed.data.type }
    )

    return NextResponse.json({ success: true, data: claim }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/claims]', err)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
