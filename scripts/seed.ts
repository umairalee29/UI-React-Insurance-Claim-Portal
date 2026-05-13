import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import * as dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.join(process.cwd(), '.env.local') })

const MONGODB_URI = process.env.MONGODB_URI
if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not set in .env.local')
  process.exit(1)
}

const UserSchema = new mongoose.Schema(
  { name: String, email: String, passwordHash: String, role: String },
  { timestamps: true }
)

const StatusHistorySchema = new mongoose.Schema(
  { status: String, changedBy: mongoose.Schema.Types.ObjectId, changedAt: Date, note: String },
  { _id: false }
)

const ClaimSchema = new mongoose.Schema(
  {
    claimNumber: String,
    claimantId: mongoose.Schema.Types.ObjectId,
    assignedAdjusterId: mongoose.Schema.Types.ObjectId,
    type: String,
    status: String,
    incidentDate: Date,
    incidentDescription: String,
    estimatedAmount: Number,
    approvedAmount: Number,
    documents: [mongoose.Schema.Types.ObjectId],
    statusHistory: [StatusHistorySchema],
  },
  { timestamps: true }
)

const DocumentSchema = new mongoose.Schema({
  claimId: mongoose.Schema.Types.ObjectId,
  uploadedBy: mongoose.Schema.Types.ObjectId,
  fileName: String,
  fileType: String,
  fileSize: Number,
  filePath: String,
  uploadedAt: Date,
})

const AuditLogSchema = new mongoose.Schema(
  {
    action: String,
    performedBy: mongoose.Schema.Types.ObjectId,
    targetId: String,
    targetModel: String,
    metadata: mongoose.Schema.Types.Mixed,
  },
  { timestamps: { createdAt: true, updatedAt: false } }
)

const User = mongoose.models.User ?? mongoose.model('User', UserSchema)
const Claim = mongoose.models.Claim ?? mongoose.model('Claim', ClaimSchema)
const Document = mongoose.models.Document ?? mongoose.model('Document', DocumentSchema)
const AuditLog = mongoose.models.AuditLog ?? mongoose.model('AuditLog', AuditLogSchema)

const CLAIM_TYPES = ['auto', 'home', 'health', 'life', 'travel'] as const
const CLAIM_STATUSES = ['draft', 'submitted', 'under_review', 'approved', 'rejected', 'closed'] as const

const INCIDENT_DESCRIPTIONS = [
  'Vehicle collision at a highway intersection during rainy conditions. Both vehicles sustained significant damage. Police report filed.',
  'Kitchen fire caused by faulty wiring. Smoke damage throughout the ground floor. Fire department responded.',
  'Emergency appendectomy performed at City General Hospital. Post-operative complications required extended stay.',
  'Burst pipe in master bathroom during winter freeze. Water damage to floors, walls, and personal property.',
  'Lost luggage and missed connecting flight due to airline delays. Travel insurance claim for expenses.',
  'Rear-end collision in parking lot at low speed. Bumper and trunk damage. No injuries.',
  'Wind storm damaged roof shingles and gutters. Water infiltration into attic space.',
  'Slip and fall injury at a grocery store. Broken wrist required surgery and physical therapy.',
  'Vehicle theft from residential driveway overnight. Recovered without catalytic converter.',
  'Hailstorm damaged vehicle hood, roof, and windshield. Multiple dents throughout.',
  'Dental emergency requiring root canal and crown replacement. Procedure performed at dental clinic.',
  'Garage door malfunction caused vehicle damage when door closed unexpectedly.',
  'Flood damage to basement and ground floor contents following heavy rainfall.',
  'Motorcycle accident on county road. Rider sustained road rash and fractured collarbone.',
  'Medical expenses from emergency room visit for chest pain and monitoring.',
  'Tree fell on fence and shed during storm. Structural damage to shed roof.',
  'Prescription medication costs for chronic condition management over 6-month period.',
  'Travel cancellation due to sudden hospitalization of family member. Non-refundable bookings.',
  'Commercial vehicle side mirror damaged in tight warehouse parking incident.',
  'Home break-in with theft of electronics, jewelry, and cash. Police report filed.',
]

const FILE_NAMES = [
  'police_report.pdf',
  'medical_records.pdf',
  'repair_estimate.pdf',
  'photos_damage.jpg',
  'insurance_form.pdf',
  'doctor_letter.pdf',
  'receipt_expenses.pdf',
  'incident_report.pdf',
  'hospital_bill.pdf',
  'contractor_quote.pdf',
]

function randomFrom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function daysAgo(days: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d
}

async function seed() {
  await mongoose.connect(MONGODB_URI!)
  console.log('✅ Connected to MongoDB')

  await Promise.all([
    User.deleteMany({}),
    Claim.deleteMany({}),
    Document.deleteMany({}),
    AuditLog.deleteMany({}),
  ])
  console.log('🗑  Cleared existing data')

  const [claimantUser, adjusterUser, managerUser] = await User.create([
    {
      name: 'Alex Johnson',
      email: 'claimant@demo.com',
      passwordHash: await bcrypt.hash('Claimant123!', 12),
      role: 'claimant',
    },
    {
      name: 'Sarah Mitchell',
      email: 'adjuster@demo.com',
      passwordHash: await bcrypt.hash('Adjuster123!', 12),
      role: 'adjuster',
    },
    {
      name: 'Robert Chen',
      email: 'manager@demo.com',
      passwordHash: await bcrypt.hash('Manager123!', 12),
      role: 'manager',
    },
  ])
  console.log('👥 Created 3 demo users')

  const claimsData = []
  const year = new Date().getFullYear()

  for (let i = 0; i < 20; i++) {
    const statusIndex = Math.min(i % 6, CLAIM_STATUSES.length - 1)
    const status = CLAIM_STATUSES[statusIndex]
    const type = CLAIM_TYPES[i % CLAIM_TYPES.length]
    const createdDaysAgo = 90 - i * 4

    const statusHistory = [
      {
        status: 'submitted',
        changedBy: claimantUser._id,
        changedAt: daysAgo(createdDaysAgo),
        note: 'Claim submitted',
      },
    ]

    if (['under_review', 'approved', 'rejected', 'closed'].includes(status)) {
      statusHistory.push({
        status: 'under_review',
        changedBy: adjusterUser._id,
        changedAt: daysAgo(createdDaysAgo - 2),
        note: 'Claim taken under review',
      })
    }
    if (['approved', 'rejected', 'closed'].includes(status)) {
      const finalNote =
        status === 'approved'
          ? 'All documentation verified. Claim approved.'
          : status === 'rejected'
          ? 'Insufficient documentation provided. Claim rejected.'
          : 'Claim closed per manager request.'
      statusHistory.push({
        status,
        changedBy: status === 'closed' ? managerUser._id : adjusterUser._id,
        changedAt: daysAgo(createdDaysAgo - 5),
        note: finalNote,
      })
    }

    const estimatedAmount = Math.floor(Math.random() * 50000 + 500)

    claimsData.push({
      claimNumber: `CLM-${year}-${String(i + 1).padStart(5, '0')}`,
      claimantId: claimantUser._id,
      assignedAdjusterId: status !== 'draft' && status !== 'submitted' ? adjusterUser._id : null,
      type,
      status: status === 'draft' && i > 0 ? 'submitted' : status,
      incidentDate: daysAgo(createdDaysAgo + 3),
      incidentDescription: INCIDENT_DESCRIPTIONS[i],
      estimatedAmount,
      approvedAmount: status === 'approved' ? Math.floor(estimatedAmount * 0.85) : null,
      statusHistory,
      documents: [],
      createdAt: daysAgo(createdDaysAgo),
      updatedAt: daysAgo(Math.max(0, createdDaysAgo - 5)),
    })
  }

  const claims = await Claim.insertMany(claimsData)
  console.log(`📋 Created ${claims.length} claims`)

  const documents = []
  const auditLogs = []

  for (const claim of claims) {
    const docCount = 2 + (Math.random() > 0.5 ? 1 : 0)

    for (let d = 0; d < docCount; d++) {
      const fileName = FILE_NAMES[(d + claims.indexOf(claim)) % FILE_NAMES.length]
      const ext = fileName.split('.').pop()
      const fileType = ext === 'pdf' ? 'application/pdf' : 'image/jpeg'
      const doc = {
        claimId: claim._id,
        uploadedBy: claimantUser._id,
        fileName,
        fileType,
        fileSize: Math.floor(Math.random() * 2_000_000 + 50_000),
        filePath: `seed-${claim._id}-${d}.${ext}`,
        uploadedAt: claim.createdAt,
      }
      documents.push(doc)
    }

    auditLogs.push({
      action: 'CLAIM_CREATED',
      performedBy: claimantUser._id,
      targetId: claim._id.toString(),
      targetModel: 'Claim',
      metadata: { status: claim.status, type: claim.type },
      createdAt: claim.createdAt,
    })

    for (const entry of (claim as { statusHistory: Array<{ status: string; changedBy: mongoose.Types.ObjectId; changedAt: Date; note: string }> }).statusHistory.slice(1)) {
      auditLogs.push({
        action: 'CLAIM_STATUS_UPDATED',
        performedBy: entry.changedBy,
        targetId: claim._id.toString(),
        targetModel: 'Claim',
        metadata: { newStatus: entry.status, note: entry.note },
        createdAt: entry.changedAt,
      })
    }
  }

  const insertedDocs = await Document.insertMany(documents)

  let docIndex = 0
  for (const claim of claims) {
    const docCount = 2 + (Math.random() > 0.5 ? 1 : 0)
    const claimDocIds = insertedDocs
      .slice(docIndex, docIndex + docCount)
      .map((d) => d._id)
    await Claim.findByIdAndUpdate(claim._id, { $set: { documents: claimDocIds } })
    docIndex += docCount
  }

  await AuditLog.insertMany(auditLogs)

  console.log(`📎 Created ${insertedDocs.length} documents`)
  console.log(`📝 Created ${auditLogs.length} audit log entries`)

  console.log('\n🎉 Seed complete!')
  console.log('\n Demo Credentials:')
  console.log('  Claimant  → claimant@demo.com  / Claimant123!')
  console.log('  Adjuster  → adjuster@demo.com  / Adjuster123!')
  console.log('  Manager   → manager@demo.com   / Manager123!')

  await mongoose.disconnect()
  process.exit(0)
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err)
  process.exit(1)
})
