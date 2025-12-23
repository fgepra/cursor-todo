import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

/**
 * 서버 컴포넌트 / 서버 액션용 Supabase 클라이언트
 *
 * - 쿠키 기반 인증 상태 유지
 * - 환경변수:
 *   - NEXT_PUBLIC_SUPABASE_URL
 *   - NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: { path?: string; maxAge?: number }) {
          cookieStore.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: { path?: string }) {
          cookieStore.set({
            name,
            value: "",
            ...options,
            maxAge: 0,
          });
        },
      },
    }
  );
}


