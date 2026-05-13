import { Types } from 'mongoose'

export type ClaimStatus = 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'closed'
export type ClaimType = 'auto' | 'home' | 'health' | 'life' | 'travel'
export type UserRole = 'claimant' | 'adjuster' | 'manager'

export interface IUser {
  _id: Types.ObjectId | string
  name: string
  email: string
  passwordHash: string
  role: UserRole
  createdAt: Date
  updatedAt: Date
}

export interface IStatusHistoryEntry {
  status: ClaimStatus
  changedBy: Types.ObjectId | string
  changedAt: Date
  note: string
}

export interface IClaim {
  _id: Types.ObjectId | string
  claimNumber: string
  claimantId: Types.ObjectId | string
  assignedAdjusterId?: Types.ObjectId | string
  type: ClaimType
  status: ClaimStatus
  incidentDate: Date
  incidentDescription: string
  estimatedAmount: number
  approvedAmount?: number
  documents: Array<Types.ObjectId | string>
  statusHistory: IStatusHistoryEntry[]
  createdAt: Date
  updatedAt: Date
}

export interface IDocument {
  _id: Types.ObjectId | string
  claimId: Types.ObjectId | string
  uploadedBy: Types.ObjectId | string
  fileName: string
  fileType: string
  fileSize: number
  filePath: string
  uploadedAt: Date
}

export interface IAuditLog {
  _id: Types.ObjectId | string
  action: string
  performedBy: Types.ObjectId | string
  targetId: string
  targetModel: string
  metadata: Record<string, unknown>
  createdAt: Date
}

export interface ClaimWithPopulated extends Omit<IClaim, 'claimantId' | 'assignedAdjusterId' | 'documents'> {
  claimantId: IUser
  assignedAdjusterId?: IUser
  documents: IDocument[]
}

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface ClaimFilters {
  status?: ClaimStatus
  type?: ClaimType
  search?: string
  page?: number
  limit?: number
  dateFrom?: string
  dateTo?: string
}
