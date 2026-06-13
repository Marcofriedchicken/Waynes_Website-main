'use client'

import { useEffect, useState } from 'react'

export default function TestPage() {
  const [status, setStatus] = useState('Testing...')

  useEffect(() => {
    async function test() {
      try {
        const { supabase } = await import('@/lib/supabase')
        if (!supabase) {
          setStatus('⚠ Supabase is not configured.')
          return
        }
        const { error } = await supabase.from('customers').select('*').limit(1)
        if (error) {
          setStatus('❌ Error: ' + error.message)
        } else {
          setStatus('✅ Supabase connected!')
        }
      } catch (e) {
        setStatus('❌ Exception: ' + String(e))
      }
    }
    test()
  }, [])

  return (
    <div style={{ padding: 40, fontSize: 24, color: 'white' }}>
      {status}
    </div>
  )
}