import { Link } from 'react-router-dom'

import AuthLayout from '@/components/auth/AuthLayout'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

function LoginPage() {
  function handleSubmit(event) {
    event.preventDefault()
  }

  return (
    <AuthLayout subtitle="Enter your details to access your workspace." title="Welcome back">
      <form className="space-y-5" onSubmit={handleSubmit}>
        <Input autoComplete="email" label="Work email" name="email" placeholder="you@company.com" type="email" />
        <div>
          <div className="mb-1.5 flex items-center justify-between gap-4">
            <label className="text-sm font-medium text-ink-secondary" htmlFor="password">Password</label>
            <Link className="text-xs font-medium text-brand-600 hover:text-brand-700" to="/forgot-password">
              Forgot password?
            </Link>
          </div>
          <Input autoComplete="current-password" id="password" name="password" placeholder="Enter your password" type="password" />
        </div>
        <label className="flex w-fit items-center gap-2 text-sm text-ink-secondary">
          <input className="size-4 rounded border-line-strong text-brand-600 focus:ring-brand-500" name="remember" type="checkbox" />
          Remember me
        </label>
        <Button className="w-full" type="submit">Sign in</Button>
      </form>
      <p className="mt-8 text-center text-sm text-ink-muted">
        New to SalesGenie?{' '}
        <Link className="font-medium text-brand-600 hover:text-brand-700" to="/signup">Create an account</Link>
      </p>
    </AuthLayout>
  )
}

export default LoginPage
