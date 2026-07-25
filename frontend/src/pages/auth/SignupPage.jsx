import { Link } from 'react-router-dom'

import AuthLayout from '@/components/auth/AuthLayout'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

function SignupPage() {
  function handleSubmit(event) {
    event.preventDefault()
  }

  return (
    <AuthLayout subtitle="Start organizing your sales work in one place." title="Create your account">
      <form className="space-y-5" onSubmit={handleSubmit}>
        <Input autoComplete="name" label="Full name" name="name" placeholder="Your full name" />
        <Input autoComplete="email" label="Work email" name="email" placeholder="you@company.com" type="email" />
        <Input autoComplete="new-password" hint="Use at least 8 characters." label="Password" name="password" placeholder="Create a password" type="password" />
        <label className="flex items-start gap-2 text-sm leading-5 text-ink-secondary">
          <input className="mt-0.5 size-4 shrink-0 rounded border-line-strong text-brand-600 focus:ring-brand-500" name="terms" type="checkbox" />
          <span>I agree to the Terms of Service and Privacy Policy.</span>
        </label>
        <Button className="w-full" type="submit">Create account</Button>
      </form>
      <p className="mt-8 text-center text-sm text-ink-muted">
        Already have an account?{' '}
        <Link className="font-medium text-brand-600 hover:text-brand-700" to="/login">Sign in</Link>
      </p>
    </AuthLayout>
  )
}

export default SignupPage
