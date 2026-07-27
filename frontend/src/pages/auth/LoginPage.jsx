import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { login } from "@/services/api/auth";
import AuthLayout from '@/components/auth/AuthLayout'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

function LoginPage() {
  const navigate = useNavigate();

const [email, setEmail] = useState("");
const [password, setPassword] = useState("");
const [loading, setLoading] = useState(false);
  async function handleSubmit(event) {
  event.preventDefault();

  try {
    setLoading(true);

    const data = await login(email, password);

    console.log(data);

    localStorage.setItem("access_token", data.access_token);

    navigate("/dashboard");

  } catch (error) {
    console.error(error);
    alert("Login failed");
  } finally {
    setLoading(false);
  }
}

  return (
    <AuthLayout subtitle="Enter your details to access your workspace." title="Welcome back">
      <form className="space-y-5" onSubmit={handleSubmit}>
        <Input
  autoComplete="email"
  label="Work email"
  name="email"
  placeholder="you@company.com"
  type="email"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
/>
        <div>
          <div className="mb-1.5 flex items-center justify-between gap-4">
            <label className="text-sm font-medium text-ink-secondary" htmlFor="password">Password</label>
            <Link className="text-xs font-medium text-brand-600 hover:text-brand-700" to="/forgot-password">
              Forgot password?
            </Link>
          </div>
          <Input
  autoComplete="current-password"
  id="password"
  name="password"
  placeholder="Enter your password"
  type="password"
  value={password}
  onChange={(e) => setPassword(e.target.value)}
/>
        </div>
        <label className="flex w-fit items-center gap-2 text-sm text-ink-secondary">
          <input className="size-4 rounded border-line-strong text-brand-600 focus:ring-brand-500" name="remember" type="checkbox" />
          Remember me
        </label>
        <Button
  className="w-full"
  type="submit"
  disabled={loading}
>
  {loading ? "Signing in..." : "Sign in"}
</Button>
      </form>
      <p className="mt-8 text-center text-sm text-ink-muted">
        New to SalesGenie?{' '}
        <Link className="font-medium text-brand-600 hover:text-brand-700" to="/signup">Create an account</Link>
      </p>
    </AuthLayout>
  )
}

export default LoginPage
