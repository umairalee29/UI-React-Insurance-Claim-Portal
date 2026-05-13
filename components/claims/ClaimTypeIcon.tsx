import { ClaimType } from '@/types'

interface ClaimTypeIconProps {
  type: ClaimType
  className?: string
}

const TYPE_CONFIG: Record<ClaimType, { label: string; icon: string; bg: string; text: string }> = {
  auto: { label: 'Auto', icon: '🚗', bg: 'bg-blue-50', text: 'text-blue-700' },
  home: { label: 'Home', icon: '🏠', bg: 'bg-amber-50', text: 'text-amber-700' },
  health: { label: 'Health', icon: '❤️', bg: 'bg-red-50', text: 'text-red-700' },
  life: { label: 'Life', icon: '🛡️', bg: 'bg-purple-50', text: 'text-purple-700' },
  travel: { label: 'Travel', icon: '✈️', bg: 'bg-green-50', text: 'text-green-700' },
}

export function ClaimTypeIcon({ type, className = '' }: ClaimTypeIconProps) {
  const config = TYPE_CONFIG[type]
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-md ${config.bg} ${config.text} ${className}`}
    >
      <span>{config.icon}</span>
      {config.label}
    </span>
  )
}

export { TYPE_CONFIG }
