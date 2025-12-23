import { createBrowserClient } from "@supabase/ssr";

/**
 * 클라이언트 컴포넌트 / 훅(useEffect 등)에서 사용할 Supabase 클라이언트
 *
 * - 브라우저 환경에서만 사용
 * - 환경변수:
 *   - NEXT_PUBLIC_SUPABASE_URL
 *   - NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );
}


