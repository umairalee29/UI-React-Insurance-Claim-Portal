'use client'

import { signOut } from 'next-auth/react'
import { UserRole } from '@/types'

interface HeaderProps {
  userName?: string | null
  userEmail?: string | null
  role?: UserRole
}

const ROLE_LABEL: Record<UserRole, string> = {
  claimant: 'Claimant',
  adjuster: 'Adjuster',
  manager: 'Manager',
}

const ROLE_COLOR: Record<UserRole, string> = {
  claimant: 'bg-blue-100 text-blue-700',
  adjuster: 'bg-amber-100 text-amber-700',
  manager: 'bg-purple-100 text-purple-700',
}

function getInitials(name?: string | null): string {
  if (!name) return 'U'
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function Header({ userName, userEmail, role }: HeaderProps) {
  return (
    <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-6 sticky top-0 z-20">
      <div className="flex items-center gap-3">
        <div className="lg:hidden">
          <span className="text-primary font-heading font-bold text-lg">ClaimFlow</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {role && (
          <span className={`hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ROLE_COLOR[role]}`}>
            {ROLE_LABEL[role]}
          </span>
        )}

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-gray-800 leading-tight">{userName}</p>
            <p className="text-xs text-gray-400">{userEmail}</p>
          </div>
          <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center">
            <span className="text-white text-xs font-semibold">{getInitials(userName)}</span>
          </div>
        </div>

        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="text-gray-400 hover:text-gray-600 transition-colors"
          title="Sign out"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </div>
    </header>
  )
}
