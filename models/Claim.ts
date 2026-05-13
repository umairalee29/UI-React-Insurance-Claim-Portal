import mongoose, { Schema, Document, Model, Types } from 'mongoose'
import { IClaim, ClaimType, ClaimStatus } from '../types'

export interface ClaimDocument extends Omit<IClaim, '_id' | 'documents'>, Document {
  documents: Types.ObjectId[]
}

const StatusHistorySchema = new Schema(
  {
    status: {
      type: String,
      enum: ['draft', 'submitted', 'under_review', 'approved', 'rejected', 'closed'] satisfies ClaimStatus[],
      required: true,
    },
    changedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    changedAt: { type: Date, default: Date.now },
    note: { type: String, default: '' },
  },
  { _id: false }
)

const ClaimSchema = new Schema<ClaimDocument>(
  {
    claimNumber: { type: String, unique: true, sparse: true },
    claimantId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    assignedAdjusterId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    type: {
      type: String,
      enum: ['auto', 'home', 'health', 'life', 'travel'] satisfies ClaimType[],
      required: true,
    },
    status: {
      type: String,
      enum: ['draft', 'submitted', 'under_review', 'approved', 'rejected', 'closed'] satisfies ClaimStatus[],
      default: 'draft',
      required: true,
    },
    incidentDate: { type: Date, required: true },
    incidentDescription: { type: String, required: true, maxlength: 2000 },
    estimatedAmount: { type: Number, required: true, min: 0 },
    approvedAmount: { type: Number, default: null },
    documents: [{ type: Schema.Types.ObjectId, ref: 'Document' }],
    statusHistory: [StatusHistorySchema],
  },
  { timestamps: true }
)

ClaimSchema.pre('save', async function (next) {
  if (this.isNew && !this.claimNumber) {
    const year = new Date().getFullYear()
    const ClaimModel = this.constructor as Model<ClaimDocument>
    const count = await ClaimModel.countDocuments({
      claimNumber: { $regex: `^CLM-${year}-` },
    })
    this.claimNumber = `CLM-${year}-${String(count + 1).padStart(5, '0')}`
  }
  next()
})

ClaimSchema.index({ claimantId: 1, createdAt: -1 })
ClaimSchema.index({ status: 1 })
ClaimSchema.index({ assignedAdjusterId: 1 })

const Claim: Model<ClaimDocument> =
  mongoose.models.Claim ?? mongoose.model<ClaimDocument>('Claim', ClaimSchema)

export default Claim
