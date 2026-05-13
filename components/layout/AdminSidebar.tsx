'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { UserRole } from '@/types'

const navItems = [
  {
    href: '/adjuster/queue',
    label: 'Claim Queue',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
      </svg>
    ),
  },
]

const managerItems = [
  {
    href: '/adjuster/stats',
    label: 'Statistics',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
]

interface AdminSidebarProps {
  role?: UserRole
}

export function AdminSidebar({ role }: AdminSidebarProps) {
  const pathname = usePathname()
  const items = role === 'manager' ? [...navItems, ...managerItems] : navItems

  return (
    <aside className="fixed inset-y-0 left-0 w-64 bg-primary flex flex-col z-30 hidden lg:flex">
      <div className="h-20 px-6 flex items-center border-b border-white/10">
        <Link href="/adjuster/queue" className="flex items-center gap-2">
          <svg viewBox="0 0 32 32" className="w-9 h-9 shrink-0" fill="none">
            <path
              d="M16 3.5L5 8v9.5c0 6.8 5.2 11.2 11 13.2 5.8-2 11-6.4 11-13.2V8z"
              fill="rgba(0,0,0,0.2)"
              transform="translate(0.5,1)"
            />
            <path
              d="M16 2L4 7v10.5c0 7 5.5 11.5 12 13.5 6.5-2 12-6.5 12-13.5V7z"
              fill="rgba(255,255,255,0.18)"
            />
            <path
              d="M16 2L4 7v10.5c0 7 5.5 11.5 12 13.5 6.5-2 12-6.5 12-13.5V7z"
              stroke="rgba(255,255,255,0.45)"
              strokeWidth="1.5"
            />
            <path
              d="M10.5 16.5l3.5 3.5 7.5-8"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <div>
            <span className="text-white font-heading font-bold text-lg">ClaimFlow</span>
            <span className="block text-white/50 text-xs capitalize">{role} Portal</span>
          </div>
        </Link>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-1">
        {items.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                isActive
                  ? 'bg-white/20 text-white'
                  : 'text-white/60 hover:text-white hover:bg-white/10',
              ].join(' ')}
            >
              {item.icon}
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="px-4 py-4 border-t border-white/10">
        <div className="flex items-center gap-2 px-3">
          <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
          <span className="text-white/60 text-xs capitalize">{role} Account</span>
        </div>
      </div>
    </aside>
  )
}
