import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function createSupabaseServerClient() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value },
        set(name: string, value: string, options: Record<string, unknown>) {
          try { (cookieStore as ReturnType<typeof cookies> & { set: (v: object) => void }).set({ name, value, ...options }) } catch {}
        },
        remove(name: string, options: Record<string, unknown>) {
          try { (cookieStore as ReturnType<typeof cookies> & { set: (v: object) => void }).set({ name, value: '', ...options }) } catch {}
        },
      },
    }
  )
}
