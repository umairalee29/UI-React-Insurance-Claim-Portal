import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { PortalSidebar } from '@/components/layout/PortalSidebar'
import { Header } from '@/components/layout/Header'

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect('/login')
  if (session.user.role !== 'claimant') redirect('/adjuster/queue')

  return (
    <div className="min-h-screen bg-gray-50">
      <PortalSidebar />
      <div className="lg:pl-64 flex flex-col min-h-screen">
        <Header
          userName={session.user.name}
          userEmail={session.user.email}
        />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  )
}
