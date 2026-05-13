import mongoose, { Schema, Document, Model } from 'mongoose'
import { IAuditLog } from '../types'

export interface AuditLogDocument extends Omit<IAuditLog, '_id'>, Document {}

const AuditLogSchema = new Schema<AuditLogDocument>(
  {
    action: { type: String, required: true },
    performedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    targetId: { type: String, required: true },
    targetModel: { type: String, required: true },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
)

AuditLogSchema.index({ performedBy: 1 })
AuditLogSchema.index({ targetId: 1, targetModel: 1 })
AuditLogSchema.index({ createdAt: -1 })

const AuditLog: Model<AuditLogDocument> =
  mongoose.models.AuditLog ?? mongoose.model<AuditLogDocument>('AuditLog', AuditLogSchema)

export default AuditLog
