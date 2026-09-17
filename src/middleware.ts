import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Feeder.life Production Authentication Gate Middleware
 * 
 * Strict routing rules:
 * 1. Anonymous users attempting to access ANY protected route (/, /home, /feeding, /sos, /profile, /communities, /nearby, /messages, /settings, etc.)
 *    are immediately redirected to /login.
 * 2. Authenticated users (with active feeder_session) visiting /login or /signup
 *    are immediately redirected to / (or authenticated home).
 * 3. Protected /api routes without auth receive 401 Unauthorized.
 * 4. Public assets and auth endpoints are permitted without hindrance.
 */

// Public routes that unauthenticated users can access
const PUBLIC_PATHS = [
  '/login',
  '/signup',
  '/reset-password',
  '/api/auth/login',
  '/api/auth/signup',
  '/api/auth/sync',
  '/api/auth/lookup',
  '/api/auth/logout',
  '/api/auth/reset-password',
];

// Helper to check if session token exists and is valid
function hasSessionCookie(request: NextRequest): boolean {
  const sessionToken = request.cookies.get('feeder_session')?.value;
  if (!sessionToken || typeof sessionToken !== 'string') {
    return false;
  }
  // Check that token has the format payload.signature
  const parts = sessionToken.split('.');
  if (parts.length !== 2) {
    return false;
  }
  try {
    const payloadJson = atob(parts[0].replace(/-/g, '+').replace(/_/g, '/'));
    const payload = JSON.parse(payloadJson);
    if (!payload.id && !payload.uid) return false;
    if (payload.exp && payload.exp < Date.now()) return false;
    return true;
  } catch {
    return false;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Allow internal Next.js assets, public images, icons, and static metadata
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/images') ||
    pathname.startsWith('/avatars') ||
    pathname.startsWith('/screenshots') ||
    pathname === '/favicon.ico' ||
    pathname === '/robots.txt' ||
    pathname === '/sitemap.xml' ||
    pathname.match(/\.(png|jpg|jpeg|svg|gif|webp|ico|css|js|txt|xml|woff|woff2)$/)
  ) {
    return NextResponse.next();
  }

  const isAuthenticated = hasSessionCookie(request);
  const isPublicPath = PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(path + '/'));

  // 2. Authenticated users visiting /login or /signup should be sent to home
  if (isAuthenticated && (pathname === '/login' || pathname === '/signup')) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  // 3. Public path accessed by anonymous user -> permit
  if (isPublicPath) {
    return NextResponse.next();
  }

  // 4. Unauthenticated user accessing protected API route -> 401 JSON
  if (!isAuthenticated && pathname.startsWith('/api/')) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized. Please log in to Feeder.life.' },
      { status: 401 }
    );
  }

  // 5. Unauthenticated user accessing protected page route -> redirect directly to /login
  if (!isAuthenticated) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    // Prevent redirect loop if already on login
    if (pathname === '/login') {
      return NextResponse.next();
    }
    return NextResponse.redirect(loginUrl);
  }

  // 6. Normalize route aliases for authenticated users (e.g. /home -> /, /create -> /)
  if (pathname === '/home' || pathname === '/create') {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url);
  }


  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
