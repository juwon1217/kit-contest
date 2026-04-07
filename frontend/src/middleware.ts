import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // [TODO] Supabase 세션을 확인하여 보호된 라우트에 대한 접근 제어
  // const supabase = createMiddlewareClient({ req: request, res: NextResponse.next() })
  // const { data: { session } } = await supabase.auth.getSession()

  // 임시: 보호된 경로(/instructor, /student, /create, /join)에 접근 시 
  // 실제 세션 객체가 없으면 /login 으로 보내야 하지만 MVP 시뮬레이션을 위해 통과
  /*
  const protectedRoutes = ['/instructor', '/student', '/create', '/join', '/quiz', '/report'];
  const isProtectedRoute = protectedRoutes.some(path => request.nextUrl.pathname.startsWith(path));
  
  if (isProtectedRoute && !session) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  */

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
