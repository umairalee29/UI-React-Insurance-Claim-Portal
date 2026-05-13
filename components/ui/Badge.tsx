interface BadgeProps {
  children: React.ReactNode
  color?: 'gray' | 'blue' | 'green' | 'amber' | 'red' | 'navy' | 'purple'
  className?: string
}

const colorClasses = {
  gray: 'bg-gray-100 text-gray-700',
  blue: 'bg-blue-100 text-blue-700',
  green: 'bg-success-light text-green-700',
  amber: 'bg-warning-light text-amber-700',
  red: 'bg-danger-light text-red-700',
  navy: 'bg-primary-50 text-primary',
  purple: 'bg-purple-100 text-purple-700',
}

export function Badge({ children, color = 'gray', className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClasses[color]} ${className}`}
    >
      {children}
    </span>
  )
}
