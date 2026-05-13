import { z } from 'zod'

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

export const createClaimSchema = z.object({
  type: z.enum(['auto', 'home', 'health', 'life', 'travel'], {
    required_error: 'Please select a claim type',
  }),
  incidentDate: z.string().refine((date) => {
    const d = new Date(date)
    return !isNaN(d.getTime()) && d <= new Date()
  }, 'Incident date must be a valid past date'),
  incidentDescription: z.string().min(20, 'Description must be at least 20 characters').max(2000),
  estimatedAmount: z.coerce.number().positive('Amount must be greater than 0').max(10_000_000),
  status: z.enum(['draft', 'submitted']).optional().default('submitted'),
})

export const updateClaimSchema = z.object({
  status: z.enum(['draft', 'submitted', 'under_review', 'approved', 'rejected', 'closed']),
  note: z.string().min(1, 'A note is required when changing status'),
  approvedAmount: z.coerce.number().positive().optional(),
})

export const assignClaimSchema = z.object({
  claimId: z.string().min(1),
  adjusterId: z.string().min(1),
})

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type CreateClaimInput = z.infer<typeof createClaimSchema>
export type UpdateClaimInput = z.infer<typeof updateClaimSchema>
export type AssignClaimInput = z.infer<typeof assignClaimSchema>
