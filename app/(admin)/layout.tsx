import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { AdminSidebar } from '@/components/layout/AdminSidebar'
import { Header } from '@/components/layout/Header'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect('/login')
  if (session.user.role === 'claimant') redirect('/dashboard')

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminSidebar role={session.user.role} />
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
