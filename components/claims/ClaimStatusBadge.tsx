import { Badge } from '@/components/ui/Badge'
import { ClaimStatus } from '@/types'

interface ClaimStatusBadgeProps {
  status: ClaimStatus
}

const STATUS_CONFIG: Record<ClaimStatus, { label: string; color: 'gray' | 'blue' | 'green' | 'amber' | 'red' | 'navy' | 'purple' }> = {
  draft: { label: 'Draft', color: 'gray' },
  submitted: { label: 'Submitted', color: 'blue' },
  under_review: { label: 'Under Review', color: 'amber' },
  approved: { label: 'Approved', color: 'green' },
  rejected: { label: 'Rejected', color: 'red' },
  closed: { label: 'Closed', color: 'purple' },
}

export function ClaimStatusBadge({ status }: ClaimStatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? { label: status, color: 'gray' as const }
  return <Badge color={config.color}>{config.label}</Badge>
}

export { STATUS_CONFIG }
