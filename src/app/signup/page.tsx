'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function SignupPage() {
  const router = useRouter()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'customer' | 'designer'>('customer')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { data, error: signupError } = await supabase.auth.signUp({
      email,
      password,
    })

    if (signupError) {
      setError(signupError.message)
      setLoading(false)
      return
    }

    if (data.user) {
      const { error: profileError } = await supabase.from('profiles').insert({
        id: data.user.id,
        full_name: fullName,
        role,
      })
      if (profileError) console.error('Profile creation error:', profileError)
    }

    setLoading(false)
    router.push('/')
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-violet-600">Vestique</h1>
          <p className="text-gray-500 mt-2">Create your account</p>
        </div>

        <form onSubmit={handleSignup} className="bg-white border border-gray-200 rounded-2xl p-8 space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label className="label">Full Name</label>
            <input
              type="text"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              className="input"
              placeholder="Jane Doe"
              required
            />
          </div>

          <div>
            <label className="label">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="input"
              placeholder="you@example.com"
              required
            />
          </div>

          <div>
            <label className="label">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="input"
              placeholder="Min. 6 characters"
              minLength={6}
              required
            />
          </div>

          <div>
            <label className="label">I am a…</label>
            <select
              value={role}
              onChange={e => setRole(e.target.value as 'customer' | 'designer')}
              className="input"
            >
              <option value="customer">Customer — shopping for fashion</option>
              <option value="designer">Designer — uploading products</option>
            </select>
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Creating account…' : 'Create Account'}
          </button>

          <p className="text-center text-sm text-gray-600">
            Already have an account?{' '}
            <Link href="/login" className="text-violet-600 font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
