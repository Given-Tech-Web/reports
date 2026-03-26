import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

// Validate JWT secret in production (same as lib/auth.ts)
const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret && process.env.NODE_ENV === 'production') {
  throw new Error('JWT_SECRET environment variable is required in production');
}

const secret = new TextEncoder().encode(
  jwtSecret || 'dev-only-secret-do-not-use-in-production'
);

async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload;
  } catch (error) {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('auth-token');
  const pathname = request.nextUrl.pathname;

  // 로그인 페이지와 API는 항상 접근 가능
  const isAuthPage = pathname === '/login' || pathname === '/signup';
  const isApiRoute = pathname.startsWith('/api/');
  const isPublicRoute = pathname.startsWith('/_next/') || pathname === '/favicon.ico';
  const isAccessDeniedPage = pathname === '/access-denied';

  // Public routes는 항상 허용
  if (isApiRoute || isPublicRoute || isAccessDeniedPage) {
    return NextResponse.next();
  }

  // 관리자 페이지 보호
  const isAdminPage = pathname.startsWith('/admin');

  // 토큰이 없고 보호된 페이지에 접근하려는 경우
  if (!token && !isAuthPage) {
    // 모든 페이지는 로그인이 필요함 - 로그인 페이지로 리다이렉트
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // 토큰이 있고 로그인 페이지에 접근하려는 경우 홈으로 리다이렉트
  if (token && isAuthPage) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // 관리자 페이지 접근 시 role 체크
  if (token && isAdminPage) {
    const payload = await verifyToken(token.value);

    if (!payload || payload.role !== 'admin') {
      // 관리자가 아닌 경우 접근 거부 페이지로 리다이렉트
      return NextResponse.redirect(new URL('/access-denied', request.url));
    }
  }

  return NextResponse.next();
}

// Configure which routes to protect
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api routes
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public assets
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};