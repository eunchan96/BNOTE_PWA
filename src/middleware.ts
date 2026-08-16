import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const PROTECTED_PREFIXES = ['/sermons', '/mypage', '/bible/bookmarks', '/bible/highlights', '/bible/scraps', '/bible/memos'];

export async function middleware(request: NextRequest) {
  const isProtected = PROTECTED_PREFIXES.some((prefix) =>
    request.nextUrl.pathname.startsWith(prefix),
  );

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // 로그인 토큰 갱신은 항상 실행한다(보호되지 않은 경로 포함) - 안 그러면 성경 읽기
  // 화면처럼 가장 자주 머무는 곳에서는 갱신이 안 일어나서, 오래 머물수록 토큰이
  // 슬금슬금 만료되고 이후 서버 액션의 로그인 확인이 조용히 실패하게 된다.
  // 로그인 안 했을 때 로그인 화면으로 보내는(redirect) 건 보호된 경로에서만 한다.
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (isProtected && !session?.user) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set(
      'next',
      request.nextUrl.pathname + request.nextUrl.search,
    );
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};