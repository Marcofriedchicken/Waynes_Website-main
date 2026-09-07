import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Protect /admin/* routes with password cookie
  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
    const adminCookie = request.cookies.get('ADMIN_PASSWORD')?.value
    const expectedPassword = process.env.ADMIN_PASSWORD

    if (!expectedPassword) {
      console.warn('⚠ ADMIN_PASSWORD not set in environment')
      return NextResponse.json(
        { error: 'Admin panel not configured' },
        { status: 500 }
      )
    }

    if (!adminCookie || adminCookie !== expectedPassword) {
      // For page requests, redirect to login or deny
      if (pathname.startsWith('/admin') && !pathname.includes('/api')) {
        return NextResponse.redirect(new URL('/admin-login', request.url))
      }
      // For API requests, return 401
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
}
