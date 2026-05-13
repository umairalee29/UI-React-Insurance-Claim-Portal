import mongoose, { Schema, Document as MongooseDocument, Model } from 'mongoose'
import { IDocument } from '../types'

export interface DocumentRecord extends Omit<IDocument, '_id'>, MongooseDocument {}

const DocumentSchema = new Schema<DocumentRecord>(
  {
    claimId: { type: Schema.Types.ObjectId, ref: 'Claim', required: true },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    fileName: { type: String, required: true, trim: true },
    fileType: { type: String, required: true },
    fileSize: { type: Number, required: true },
    filePath: { type: String, required: true },
    uploadedAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
)

DocumentSchema.index({ claimId: 1 })
DocumentSchema.index({ uploadedBy: 1 })

const DocumentModel: Model<DocumentRecord> =
  mongoose.models.Document ?? mongoose.model<DocumentRecord>('Document', DocumentSchema)

export default DocumentModel
