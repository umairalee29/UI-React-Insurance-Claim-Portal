'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { loginSchema, LoginInput } from '@/lib/validations'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

type DemoRole = { label: string; email: string; password: string; color: string }

const DEMO_CREDENTIALS: DemoRole[] = [
  { label: 'Claimant', email: 'claimant@demo.com', password: 'Claimant123!', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { label: 'Adjuster', email: 'adjuster@demo.com', password: 'Adjuster123!', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { label: 'Manager', email: 'manager@demo.com', password: 'Manager123!', color: 'bg-purple-50 text-purple-700 border-purple-200' },
]

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) })

  async function onSubmit(data: LoginInput) {
    setLoading(true)
    const result = await signIn('credentials', {
      email: data.email,
      password: data.password,
      redirect: false,
    })
    setLoading(false)

    if (result?.error) {
      toast.error('Invalid email or password')
      return
    }

    const sessionRes = await fetch('/api/auth/session')
    const session = await sessionRes.json()
    const role = session?.user?.role

    if (role === 'claimant') {
      router.push('/dashboard')
    } else {
      router.push('/adjuster/queue')
    }
  }

  function fillDemo(cred: DemoRole) {
    setValue('email', cred.email)
    setValue('password', cred.password)
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-heading font-bold text-gray-900 mb-1">Sign in</h1>
      <p className="text-sm text-gray-500 mb-6">Welcome back to ClaimFlow</p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Email address"
          type="email"
          placeholder="you@example.com"
          error={errors.email?.message}
          {...register('email')}
        />
        <Input
          label="Password"
          type="password"
          placeholder="••••••••"
          error={errors.password?.message}
          {...register('password')}
        />
        <Button type="submit" className="w-full" loading={loading}>
          Sign in
        </Button>
      </form>

      <div className="mt-6">
        <p className="text-xs text-gray-400 text-center mb-3 font-medium uppercase tracking-wider">
          Demo logins
        </p>
        <div className="grid grid-cols-3 gap-2">
          {DEMO_CREDENTIALS.map((cred) => (
            <button
              key={cred.label}
              type="button"
              onClick={() => fillDemo(cred)}
              className={`px-3 py-2 rounded-lg border text-xs font-medium transition-all hover:opacity-80 ${cred.color}`}
            >
              {cred.label}
            </button>
          ))}
        </div>
      </div>

      <p className="mt-6 text-center text-sm text-gray-500">
        Don&apos;t have an account?{' '}
        <Link href="/register" className="text-primary font-medium hover:underline">
          Register
        </Link>
      </p>
    </div>
  )
}
