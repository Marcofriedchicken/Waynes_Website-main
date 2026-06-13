import { createClient } from '@supabase/supabase-js'

let supabaseInstance: ReturnType<typeof createClient> | null = null

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const supabase = (() => {
  if (!supabaseInstance && supabaseUrl && supabaseAnonKey) {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey)
  }
  return supabaseInstance
})()