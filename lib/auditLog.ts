import { connectDB } from './db'
import AuditLog from '../models/AuditLog'

export async function createAuditLog(
  action: string,
  performedBy: string,
  targetId: string,
  targetModel: string,
  metadata: Record<string, unknown> = {}
): Promise<void> {
  try {
    await connectDB()
    await AuditLog.create({
      action,
      performedBy,
      targetId,
      targetModel,
      metadata,
    })
  } catch (err) {
    console.error('[AuditLog] Failed to create audit log entry:', err)
  }
}
