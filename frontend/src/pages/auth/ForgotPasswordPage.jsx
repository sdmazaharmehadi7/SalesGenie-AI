import { Link } from 'react-router-dom'

import AuthLayout from '@/components/auth/AuthLayout'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { ArrowLeft } from '@/components/ui/icons'

function ForgotPasswordPage() {
  function handleSubmit(event) {
    event.preventDefault()
  }

  return (
    <AuthLayout subtitle="We'll send a password reset link to your work email." title="Reset your password">
      <form className="space-y-5" onSubmit={handleSubmit}>
        <Input autoComplete="email" label="Work email" name="email" placeholder="you@company.com" type="email" />
        <Button className="w-full" type="submit">Send reset link</Button>
      </form>
      <Link className="mt-8 inline-flex items-center gap-2 text-sm font-medium text-ink-secondary hover:text-ink-primary" to="/login">
        <ArrowLeft className="size-4" />
        Back to sign in
      </Link>
    </AuthLayout>
  )
}

export default ForgotPasswordPage
