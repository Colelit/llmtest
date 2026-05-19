import { createBrowserClient } from '@supabase/ssr'

// 懒加载缓存，避免构建时（SSG）因缺少环境变量而报错
let cachedClient: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  if (cachedClient) return cachedClient;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    // 构建时环境变量可能缺失，返回代理对象，实际调用时再报错
    return new Proxy({} as ReturnType<typeof createBrowserClient>, {
      get(_target, prop) {
        return () => {
          throw new Error(
            `@supabase/ssr: 缺少环境变量 NEXT_PUBLIC_SUPABASE_URL 或 NEXT_PUBLIC_SUPABASE_ANON_KEY`
          );
        };
      },
    });
  }

  cachedClient = createBrowserClient(supabaseUrl, supabaseKey);
  return cachedClient;
} 