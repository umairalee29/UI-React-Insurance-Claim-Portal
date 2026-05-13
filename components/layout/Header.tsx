'use client'

import { useState } from 'react'
import { signOut } from 'next-auth/react'
import { UserRole } from '@/types'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'

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
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

export function Header({ userName, userEmail, role }: HeaderProps) {
  const [showSignOut, setShowSignOut] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  async function handleSignOut() {
    setSigningOut(true)
    await signOut({ callbackUrl: '/login' })
  }

  return (
    <>
      <header className="h-20 bg-white border-b border-gray-100 flex items-center justify-end px-6 sticky top-0 z-20">
        <div className="flex items-center gap-5">
          {role && (
            <span className={`hidden sm:inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${ROLE_COLOR[role]}`}>
              {ROLE_LABEL[role]}
            </span>
          )}

          <div className="hidden sm:flex items-center gap-3">
            <div className="text-right">
              <p className="text-base font-semibold text-gray-800 leading-tight">{userName}</p>
              <p className="text-sm text-gray-400 leading-tight mt-0.5">{userEmail}</p>
            </div>
            <div className="w-11 h-11 rounded-full bg-primary flex items-center justify-center shrink-0 ring-2 ring-primary/10">
              <span className="text-white text-sm font-bold">{getInitials(userName)}</span>
            </div>
          </div>

          <div className="w-px h-8 bg-gray-100 hidden sm:block" />

          <button
            onClick={() => setShowSignOut(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </header>

      <Modal
        isOpen={showSignOut}
        onClose={() => !signingOut && setShowSignOut(false)}
        title="Sign Out"
        footer={
          <>
            <Button variant="secondary" size="md" disabled={signingOut} onClick={() => setShowSignOut(false)}>
              Cancel
            </Button>
            <Button variant="danger" size="md" loading={signingOut} onClick={handleSignOut}>
              Sign Out
            </Button>
          </>
        }
      >
        <div className="flex flex-col items-center text-center gap-4 py-2">
          <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center">
            <svg className="w-7 h-7 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900">Sign out of ClaimFlow?</h3>
            <p className="mt-1.5 text-sm text-gray-500">
              You are signed in as{' '}
              <span className="font-medium text-gray-700">{userName}</span>.
              <br />
              You'll need to sign back in to access your account.
            </p>
          </div>
        </div>
      </Modal>
    </>
  )
}
