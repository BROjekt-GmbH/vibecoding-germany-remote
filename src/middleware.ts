import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const userLogin = request.headers.get('tailscale-user-login');

  // Dev mode bypass — only when NODE_ENV=development
  if (!userLogin && process.env.NODE_ENV === 'development') {
    return NextResponse.next();
  }

  if (!userLogin) {
    if (request.nextUrl.pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return new NextResponse('Unauthorized', { status: 401 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next|favicon.ico|.*\\..*).*)'],
};
