import { NextResponse, type NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';

// Pages that don't require authentication
const PUBLIC_PAGES = ['/login', '/register', '/recover-password', '/reset-password'];

// API routes that don't require authentication (exact matches)
const PUBLIC_API_ROUTES = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/logout',
  '/api/auth/recover-password',
  '/api/auth/reset-password',
];

// Prefixes that don't require authentication
const PUBLIC_PREFIXES = ['/api/invitations', '/invitations'];

function isPublicRoute(pathname: string): boolean {
  if (PUBLIC_PAGES.includes(pathname)) return true;
  if (PUBLIC_API_ROUTES.includes(pathname)) return true;
  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) return true;
  return false;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip static assets
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/images')
  ) {
    return NextResponse.next();
  }

  // Allow public routes without authentication
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  // --- Authentication required beyond this point ---

  const sessionToken = request.cookies.get('session')?.value;

  if (!sessionToken) {
    if (pathname.startsWith('/api')) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  const payload = await verifyToken(sessionToken);

  if (!payload) {
    // Token is invalid or expired — clear the bad cookie
    const response = pathname.startsWith('/api')
      ? NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
      : NextResponse.redirect(new URL(`/login?redirect=${encodeURIComponent(pathname)}`, request.url));
    response.cookies.delete('session');
    return response;
  }

  // Inject user info into request headers for downstream route handlers
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-user-id', payload.userId);
  requestHeaders.set('x-user-role', payload.rol);

  // RBAC: admin-only routes
  if (pathname.startsWith('/admin') && payload.rol !== 'admin') {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
