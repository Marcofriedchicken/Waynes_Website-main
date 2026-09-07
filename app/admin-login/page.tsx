'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

export default function AdminLoginPage() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      // Send password to server to set cookie
      const res = await fetch('/api/admin-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Invalid password')
      }

      // Success - redirect to admin pricing
      router.push('/admin/pricing')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo & Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 relative mx-auto mb-4">
            <Image
              src="/images/logo.png"
              alt="Wayne's Detailing"
              fill
              className="object-contain"
            />
          </div>
          <h1 className="text-3xl font-black text-white mb-2">Admin Panel</h1>
          <p className="text-white/50">Wayne's Detailing Pricing Management</p>
        </div>

        {/* Login Form */}
        <form
          onSubmit={handleSubmit}
          className="bg-[#111111] border border-[#2a2a2a] rounded-lg p-8 space-y-6"
        >
          {/* Error Message */}
          {error && (
            <div className="bg-red-900/20 border border-red-600 text-red-300 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Password Input */}
          <div>
            <label htmlFor="password" className="block text-sm font-semibold text-white mb-2">
              Admin Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter admin password"
              disabled={loading}
              className="w-full bg-[#0F0F0F] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-[#D4A843] transition disabled:opacity-50"
              autoFocus
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || !password.trim()}
            className="w-full bg-[#ED0407] hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-lg transition duration-200"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        {/* Footer */}
        <p className="text-center text-white/40 text-xs mt-8">
          Wayne's Detailing © 2026 · Pricing Management System
        </p>
      </div>
    </div>
  )
}
