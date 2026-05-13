import { IStatusHistoryEntry } from '@/types'
import { STATUS_CONFIG } from './ClaimStatusBadge'

interface StatusTimelineProps {
  history: IStatusHistoryEntry[]
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-200 border-gray-300',
  submitted: 'bg-blue-500 border-blue-600',
  under_review: 'bg-warning border-amber-600',
  approved: 'bg-success border-green-600',
  rejected: 'bg-danger border-red-600',
  closed: 'bg-purple-500 border-purple-600',
}

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function StatusTimeline({ history }: StatusTimelineProps) {
  const sorted = [...history].sort(
    (a, b) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime()
  )

  return (
    <div className="flow-root">
      <ul className="-mb-8">
        {sorted.map((entry, idx) => (
          <li key={idx}>
            <div className="relative pb-8">
              {idx < sorted.length - 1 && (
                <span
                  className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-gray-200"
                  aria-hidden="true"
                />
              )}
              <div className="relative flex space-x-3">
                <div>
                  <span
                    className={`h-8 w-8 rounded-full flex items-center justify-center ring-2 ring-white border ${STATUS_COLORS[entry.status] ?? 'bg-gray-200'}`}
                  >
                    <span className="w-2 h-2 rounded-full bg-white" />
                  </span>
                </div>
                <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {STATUS_CONFIG[entry.status]?.label ?? entry.status}
                    </p>
                    {entry.note && (
                      <p className="mt-0.5 text-sm text-gray-500">{entry.note}</p>
                    )}
                  </div>
                  <div className="whitespace-nowrap text-right text-xs text-gray-400">
                    {formatDate(entry.changedAt)}
                  </div>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
