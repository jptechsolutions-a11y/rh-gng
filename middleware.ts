import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE } from '@/lib/auth/constants';

const PUBLIC_PATHS = ['/login', '/_next', '/favicon.ico', '/api/health'];

// Middleware faz APENAS um gate barato (presença do cookie) — validação real do
// token contra o banco é responsabilidade de `requireSession()` em cada page/action.
// Toda rota protegida DEVE chamar requireSession; o middleware apenas evita o
// round-trip ao banco quando nem há cookie.
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) return NextResponse.next();
  if (pathname === '/') return NextResponse.next();

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token || token.length < 16) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)).*)'],
};
