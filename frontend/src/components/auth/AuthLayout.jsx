import { Link } from 'react-router-dom'

import { Sparkles } from '@/components/ui/icons'

function AuthLayout({ children, subtitle, title }) {
  return (
    <main className="grid min-h-screen bg-surface-canvas lg:grid-cols-2">
      <section className="relative hidden overflow-hidden bg-slate-950 p-10 text-ink-inverse lg:flex lg:flex-col">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(59,110,234,0.45),_transparent_46%)]" />
        <Link className="relative flex items-center gap-2.5 self-start text-sm font-semibold" to="/login">
          <span className="grid size-8 place-items-center rounded-control bg-brand-500 text-sm font-bold">S</span>
          SalesGenie
        </Link>

        <div className="relative my-auto max-w-md">
          <div className="mb-6 grid size-11 place-items-center rounded-surface bg-white/10 ring-1 ring-inset ring-white/15">
            <Sparkles className="size-5 text-brand-200" />
          </div>
          <p className="text-3xl font-semibold leading-tight tracking-tight">
            Build stronger pipelines with every customer interaction.
          </p>
          <p className="mt-5 max-w-sm text-sm leading-6 text-slate-300">
            SalesGenie brings leads, conversations, and actionable intelligence into one focused workspace.
          </p>
        </div>

        <p className="relative text-xs text-slate-400">© {new Date().getFullYear()} SalesGenie. All rights reserved.</p>
      </section>

      <section className="flex min-h-screen items-center justify-center px-4 py-10 sm:px-6 lg:px-10">
        <div className="w-full max-w-[26rem]">
          <Link className="mb-10 flex items-center gap-2.5 text-sm font-semibold text-ink-primary lg:hidden" to="/login">
            <span className="grid size-8 place-items-center rounded-control bg-brand-600 text-sm font-bold text-ink-inverse">S</span>
            SalesGenie
          </Link>
          <div className="mb-8">
            <h1 className="text-3xl font-semibold tracking-tight text-ink-primary">{title}</h1>
            <p className="mt-2 text-sm leading-6 text-ink-muted">{subtitle}</p>
          </div>
          {children}
        </div>
      </section>
    </main>
  )
}

export default AuthLayout
