import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

function applySecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  response.headers.set('X-DNS-Prefetch-Control', 'off')
  return response
}

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
          })
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  // The 4 admin portals each have their own login page, checked most-specific first.
  const adminPortalLoginPaths: [string, string][] = [
    ['/admin/kyc/login', '/admin/kyc/login'],
    ['/admin/finance/login', '/admin/finance/login'],
    ['/admin/support/login', '/admin/support/login'],
    ['/admin/login', '/admin/login'],
  ]
  const isAdminPortalLoginPage = adminPortalLoginPaths.some(([path]) => pathname === path)

  if (pathname.startsWith('/admin') && !isAdminPortalLoginPage) {
    const portalLogin =
      pathname.startsWith('/admin/kyc') ? '/admin/kyc/login' :
      pathname.startsWith('/admin/finance') ? '/admin/finance/login' :
      pathname.startsWith('/admin/support') ? '/admin/support/login' :
      '/admin/login'

    if (!user) {
      const redirectUrl = new URL(portalLogin, request.url)
      redirectUrl.searchParams.set('redirect', pathname)
      return applySecurityHeaders(NextResponse.redirect(redirectUrl))
    }

    return applySecurityHeaders(supabaseResponse)
  }

  if (isAdminPortalLoginPage && user) {
    // Already signed in -- the login form itself validates portal access and
    // redirects; here we just avoid trapping a logged-in admin on a login page.
    return applySecurityHeaders(supabaseResponse)
  }

  // Protected routes (non-admin)
  const protectedPaths = ['/dashboard', '/vendor']
  const isProtectedPath = protectedPaths.some(path => 
    request.nextUrl.pathname.startsWith(path)
  )

  if (isProtectedPath && !user) {
    const redirectUrl = new URL('/auth/login', request.url)
    redirectUrl.searchParams.set('redirect', request.nextUrl.pathname)
    return applySecurityHeaders(NextResponse.redirect(redirectUrl))
  }

  // Auth routes (redirect if already logged in)
  const authPaths = ['/auth/login', '/auth/register', '/auth/forgot-password']
  const isAuthPath = authPaths.some(path => 
    request.nextUrl.pathname.startsWith(path)
  )

  if (isAuthPath && user) {
    return applySecurityHeaders(NextResponse.redirect(new URL('/dashboard', request.url)))
  }

  return applySecurityHeaders(supabaseResponse)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
