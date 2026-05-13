import { IStatusHistoryEntry } from '@/types'
import { ClaimStatusBadge } from './ClaimStatusBadge'

interface StatusTimelineProps {
  history: IStatusHistoryEntry[]
}

type StatusKey = 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'closed'

const STATUS_META: Record<StatusKey, {
  label: string
  iconBg: string
  iconColor: string
  cardBg: string
  noteBg: string
  iconPath: string
}> = {
  draft: {
    label: 'Draft',
    iconBg: 'bg-gray-100',
    iconColor: 'text-gray-500',
    cardBg: 'bg-gray-50',
    noteBg: 'bg-gray-100',
    iconPath: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z',
  },
  submitted: {
    label: 'Submitted',
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    cardBg: 'bg-blue-50',
    noteBg: 'bg-blue-100',
    iconPath: 'M12 19l9 2-9-18-9 18 9-2zm0 0v-8',
  },
  under_review: {
    label: 'Under Review',
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    cardBg: 'bg-amber-50',
    noteBg: 'bg-amber-100',
    iconPath: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z',
  },
  approved: {
    label: 'Approved',
    iconBg: 'bg-green-100',
    iconColor: 'text-green-600',
    cardBg: 'bg-green-50',
    noteBg: 'bg-green-100',
    iconPath: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
  },
  rejected: {
    label: 'Rejected',
    iconBg: 'bg-red-100',
    iconColor: 'text-red-600',
    cardBg: 'bg-red-50',
    noteBg: 'bg-red-100',
    iconPath: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z',
  },
  closed: {
    label: 'Closed',
    iconBg: 'bg-purple-100',
    iconColor: 'text-purple-600',
    cardBg: 'bg-purple-50',
    noteBg: 'bg-purple-100',
    iconPath: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z',
  },
}

function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
function formatTime(date: Date | string) {
  return new Date(date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

export function StatusTimeline({ history }: StatusTimelineProps) {
  const sorted = [...history].sort(
    (a, b) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime()
  )

  const statusSet = new Set(history.map((e) => e.status))
  const currentStatus = sorted[0]?.status

  const decisionStatus: StatusKey | null = statusSet.has('approved')
    ? 'approved'
    : statusSet.has('rejected')
    ? 'rejected'
    : null

  const progressSteps: { key: string; label: string; dotClass: string }[] = [
    { key: 'draft',        label: 'Draft',        dotClass: 'bg-gray-400' },
    { key: 'submitted',    label: 'Submitted',    dotClass: 'bg-blue-500' },
    { key: 'under_review', label: 'Under Review', dotClass: 'bg-amber-500' },
    {
      key: decisionStatus ?? 'decision',
      label: decisionStatus === 'approved' ? 'Approved' : decisionStatus === 'rejected' ? 'Rejected' : 'Decision',
      dotClass: decisionStatus === 'approved' ? 'bg-green-500' : decisionStatus === 'rejected' ? 'bg-red-500' : 'bg-gray-300',
    },
    { key: 'closed', label: 'Closed', dotClass: 'bg-purple-500' },
  ]

  const currentStepIndex = (() => {
    if (currentStatus === 'closed') return 4
    if (currentStatus === 'approved' || currentStatus === 'rejected') return 3
    if (currentStatus === 'under_review') return 2
    if (currentStatus === 'submitted') return 1
    return 0
  })()

  const progressPct = (currentStepIndex / (progressSteps.length - 1)) * 100

  return (
    <div className="space-y-6 py-1">

      {/* ── Progress strip ─────────────────────────────── */}
      <div className="relative px-4">
        {/* Track */}
        <div className="absolute top-4 left-8 right-8 h-0.5 bg-gray-200" />
        {/* Fill */}
        <div
          className="absolute top-4 left-8 h-0.5 bg-primary transition-all duration-500"
          style={{ width: `calc(${progressPct}% * (100% - 4rem) / 100)` }}
        />

        <div className="relative flex justify-between">
          {progressSteps.map((step, idx) => {
            const isCompleted = idx < currentStepIndex
            const isCurrent  = idx === currentStepIndex
            const isUpcoming  = idx > currentStepIndex

            return (
              <div key={step.key} className="flex flex-col items-center gap-2.5 z-10">
                <div
                  className={[
                    'w-8 h-8 rounded-full flex items-center justify-center ring-4 ring-white',
                    isCompleted ? step.dotClass : isCurrent ? step.dotClass : 'bg-gray-200',
                  ].join(' ')}
                >
                  {isCompleted && (
                    <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                  {isCurrent && (
                    <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
                  )}
                  {isUpcoming && (
                    <span className="w-2 h-2 rounded-full bg-gray-400" />
                  )}
                </div>
                <span
                  className={[
                    'text-xs font-medium text-center leading-tight',
                    isCurrent  ? 'text-gray-800' : isCompleted ? 'text-gray-500' : 'text-gray-300',
                  ].join(' ')}
                  style={{ maxWidth: 56 }}
                >
                  {step.label}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      <div className="border-t border-gray-100" />

      {/* ── Entry cards ────────────────────────────────── */}
      <div className="space-y-3">
        {sorted.map((entry, idx) => {
          const meta = STATUS_META[entry.status as StatusKey]
          const isLatest = idx === 0
          if (!meta) return null

          return (
            <div
              key={idx}
              className={[
                'flex gap-4 p-4 rounded-xl border transition-all',
                isLatest
                  ? `${meta.cardBg} border-gray-200 ring-2 ring-primary/10 ring-offset-1`
                  : 'bg-gray-50 border-gray-100',
              ].join(' ')}
            >
              {/* Icon badge */}
              <div
                className={[
                  'w-9 h-9 rounded-xl flex items-center justify-center shrink-0',
                  isLatest ? meta.iconBg : 'bg-white border border-gray-200',
                ].join(' ')}
              >
                <svg
                  className={`w-4 h-4 ${isLatest ? meta.iconColor : 'text-gray-400'}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={meta.iconPath} />
                </svg>
              </div>

              {/* Body */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <ClaimStatusBadge status={entry.status} />
                    {isLatest && (
                      <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                        Current
                      </span>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-medium text-gray-500">{formatDate(entry.changedAt)}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{formatTime(entry.changedAt)}</p>
                  </div>
                </div>

                {entry.note && (
                  <div className={`mt-2.5 px-3 py-2 rounded-lg ${isLatest ? meta.noteBg : 'bg-gray-100'}`}>
                    <p className="text-xs text-gray-600 leading-relaxed">{entry.note}</p>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
