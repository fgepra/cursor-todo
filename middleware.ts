import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: { 
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: { path?: string; maxAge?: number }) {
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set(name, value, {
            path: options.path ?? "/",
            maxAge: options.maxAge,
          });
        },
        remove(name: string, options: { path?: string }) {
          request.cookies.delete(name);
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.delete(name);
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // 1. 보호된 경로 (로그인 없이 접근 불가)
  // startsWith("/") 대신 정확히 "/"인지만 확인하거나 다른 경로를 추가하세요.
  const isRootPath = pathname === "/";
  
  // 2. 인증 전용 경로 (로그인한 사용자는 접근 불가)
  const isAuthOnlyPath = pathname.startsWith("/login") || pathname.startsWith("/signup");

  // [로직 1] 로그인하지 않은 사용자가 메인 페이지("/")에 접속 시도 시 -> 로그인으로 보냄
  if (!user && isRootPath) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // [로직 2] 이미 로그인한 사용자가 로그인/회원가입 페이지 접속 시도 시 -> 메인으로 보냄
  if (user && isAuthOnlyPath) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * 다음으로 시작하는 경로를 제외한 모든 요청 경로에 실행:
     * - api (API 라우트)
     * - _next/static (정적 파일)
     * - _next/image (이미지 최적화 파일)
     * - favicon.ico (파비콘)
     * - 이미지 파일 확장자들
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}; 