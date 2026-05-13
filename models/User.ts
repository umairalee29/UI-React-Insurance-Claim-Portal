import mongoose, { Schema, Document, Model } from 'mongoose'
import { IUser, UserRole } from '../types'

export interface UserDocument extends Omit<IUser, '_id'>, Document {}

const UserSchema = new Schema<UserDocument>(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ['claimant', 'adjuster', 'manager'] satisfies UserRole[],
      required: true,
      default: 'claimant',
    },
  },
  { timestamps: true }
)

UserSchema.index({ role: 1 })

const User: Model<UserDocument> =
  mongoose.models.User ?? mongoose.model<UserDocument>('User', UserSchema)

export default User
