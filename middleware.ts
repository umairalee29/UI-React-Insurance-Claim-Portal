import NextAuth from 'next-auth'
import { authConfig } from '@/lib/auth.config'
import { NextResponse } from 'next/server'

const { auth } = NextAuth({
  ...authConfig,
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
})

export default auth((req) => {
  const { pathname } = req.nextUrl
  const session = req.auth

  const isPortalRoute =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/claims') ||
    pathname.startsWith('/documents')

  const isAdminRoute = pathname.startsWith('/adjuster')

  if (isPortalRoute || isAdminRoute) {
    if (!session) {
      const loginUrl = new URL('/login', req.url)
      loginUrl.searchParams.set('callbackUrl', pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  if (isAdminRoute && session?.user?.role === 'claimant') {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  if (isPortalRoute && !isAdminRoute && session?.user?.role && session.user.role !== 'claimant') {
    return NextResponse.redirect(new URL('/adjuster/queue', req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|uploads).*)'],
}
