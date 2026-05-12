import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  // 从环境变量中读取Supabase的URL和anon key
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  // 创建并返回一个Supabase客户端实例
  return createBrowserClient(supabaseUrl, supabaseKey)
} 