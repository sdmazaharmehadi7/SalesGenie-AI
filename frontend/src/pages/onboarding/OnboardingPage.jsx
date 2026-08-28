import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useWorkspace } from '@/context/WorkspaceContext'
import { useToast } from '@/context/ToastContext'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  ChevronLeft,
  Crown,
  LogOut,
  Mail,
  Plus,
  Sparkles,
  User,
  Users,
} from '@/components/ui/icons'

function getInitials(name) {
  if (!name) return 'U'
  const parts = name.trim().split(/\s+/)
  const first = parts[0]?.[0] || ''
  const last = parts.length > 1 ? parts[parts.length - 1][0] : ''
  return (first + last).toUpperCase() || 'U'
}

export default function OnboardingPage() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const {
    switchToPersonal,
    createWorkspace,
    joinWorkspace,
  } = useWorkspace()
  const { showToast } = useToast()

  const displayName = user?.name || user?.email?.split('@')[0] || 'User'
  const initials = getInitials(displayName)

  // Active sub-flow: null | 'create' | 'join'
  const [activeFlow, setActiveFlow] = useState(null)

  // Form states
  const [createName, setCreateName] = useState('')
  const [createDescription, setCreateDescription] = useState('')
  const [createError, setCreateError] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  const [inviteCode, setInviteCode] = useState('')
  const [joinError, setJoinError] = useState('')
  const [isJoining, setIsJoining] = useState(false)

  // ─── Flow: Select Personal Area ─────────────────────────────────────────────
  function handleSelectPersonal() {
    switchToPersonal(displayName)
    if (user?.id) {
      localStorage.setItem(`sg_onboarded_${user.id}`, 'true')
    }
    showToast('Entered Personal Area!', 'success')
    navigate('/personal', { replace: true })
  }

  // ─── Flow: Create Workspace ──────────────────────────────────────────────────
  async function handleCreateSubmit(e) {
    e.preventDefault()
    setCreateError('')

    if (!createName.trim()) {
      setCreateError('Please enter a workspace name.')
      return
    }

    setIsCreating(true)
    try {
      const newWs = await createWorkspace({
        name: createName.trim(),
        description: createDescription.trim(),
      })
      setIsCreating(false)
      if (user?.id) {
        localStorage.setItem(`sg_onboarded_${user.id}`, 'true')
      }
      showToast(`Workspace "${newWs.name}" created! You are the Manager.`, 'success')
      navigate(`/workspace/${newWs.id}`, { replace: true })
    } catch (err) {
      setIsCreating(false)
      const msg = err?.response?.data?.detail || 'Failed to create workspace. Please try again.'
      setCreateError(Array.isArray(msg) ? msg.map((m) => m.msg).join(', ') : String(msg))
    }
  }

  // ─── Flow: Join Workspace with Code ─────────────────────────────────────────
  async function handleJoinSubmit(e) {
    e.preventDefault()
    setJoinError('')

    if (!inviteCode.trim()) {
      setJoinError('Please enter a valid invitation token.')
      return
    }

    setIsJoining(true)
    try {
      const result = await joinWorkspace({ inviteCode: inviteCode.trim() })
      if (!result.success) {
        setJoinError(result.error)
        setIsJoining(false)
        return
      }

      setIsJoining(false)
      if (user?.id) {
        localStorage.setItem(`sg_onboarded_${user.id}`, 'true')
      }
      showToast(`Joined ${result.workspace.name} as Team Member!`, 'success')
      navigate(`/workspace/${result.workspace.id}`, { replace: true })
    } catch (err) {
      setIsJoining(false)
      setJoinError('Failed to join workspace. Please check your token.')
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-surface-canvas text-ink-primary">
      {/* ─── Top Navbar ──────────────────────────────────────────────────────── */}
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-line-default bg-surface-default px-4 sm:px-8">
        <div className="flex items-center gap-3">
          <span className="grid size-8 place-items-center rounded-control bg-brand-600 text-xs font-bold text-ink-inverse">
            AI
          </span>
          <span className="text-sm font-semibold tracking-tight text-ink-primary">
            SalesGenie AI
          </span>
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-2">
            <span className="grid size-7 place-items-center rounded-full bg-slate-900 text-xs font-semibold text-white">
              {initials}
            </span>
            <span className="hidden text-xs font-medium text-ink-secondary sm:inline">
              {displayName}
            </span>
          </div>

          <button
            className="flex items-center gap-1.5 rounded-control border border-line-default px-2.5 py-1 text-xs text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink-primary"
            onClick={logout}
            type="button"
          >
            <LogOut className="size-3.5" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </header>

      {/* ─── Main Content ─────────────────────────────────────────────────────── */}
      <main className="flex-1 px-4 py-8 sm:px-8 sm:py-12">
        <div className="mx-auto max-w-3xl">

          {/* ── Header ── */}
          <div className="text-center">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-brand-700">
              <Sparkles className="size-3.5" />
              <span>Get Started with SalesGenie AI</span>
            </div>

            <h1 className="mt-3 text-2xl font-bold tracking-tight text-ink-primary sm:text-3xl">
              Welcome, {displayName}
            </h1>

            <p className="mx-auto mt-2 max-w-xl text-sm text-ink-muted">
              Choose how you would like to begin. Set up your private Personal Area, create a new team workspace, or join an existing organization.
            </p>
          </div>

          {/* ─── SUB-FLOW: Create Workspace Form ─────────────────────────────── */}
          {activeFlow === 'create' && (
            <div className="mt-8 rounded-card border border-line-default bg-surface-default p-6 shadow-card animate-in fade-in zoom-in-95 duration-150 sm:p-8">
              <div className="flex items-center justify-between border-b border-line-default pb-4">
                <button
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-muted transition-colors hover:text-ink-primary"
                  onClick={() => { setActiveFlow(null); setCreateError('') }}
                  type="button"
                >
                  <ChevronLeft className="size-4" />
                  <span>Back to options</span>
                </button>

                <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">
                  Manager Role
                </span>
              </div>

              <div className="mt-6">
                <div className="flex items-center gap-3">
                  <div className="grid size-10 place-items-center rounded-control bg-indigo-50 text-indigo-600">
                    <Building2 className="size-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-ink-primary">
                      Create a New Workspace
                    </h2>
                    <p className="text-xs text-ink-muted">
                      You will be the Manager/Owner of this workspace with full team and CRM controls.
                    </p>
                  </div>
                </div>

                <form className="mt-6 space-y-4" onSubmit={handleCreateSubmit}>
                  <div>
                    <Input
                      autoFocus
                      label="Workspace Name"
                      name="createName"
                      placeholder="e.g. North America Enterprise Sales"
                      value={createName}
                      onChange={(e) => setCreateName(e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-ink-secondary" htmlFor="onb-desc">
                      Description <span className="text-xs text-ink-muted font-normal">(Optional)</span>
                    </label>
                    <textarea
                      className="flex min-h-[72px] w-full rounded-control border border-line-strong bg-surface-default p-3 text-sm text-ink-primary focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                      id="onb-desc"
                      placeholder="e.g. B2B Outbound SDR pipeline, lead qualification, and revenue forecasting."
                      rows={2}
                      value={createDescription}
                      onChange={(e) => setCreateDescription(e.target.value)}
                    />
                  </div>

                  <div className="flex items-start gap-2.5 rounded-control border border-indigo-100 bg-indigo-50/70 p-3 text-xs text-indigo-950">
                    <Crown className="size-4 shrink-0 text-indigo-600 mt-0.5" />
                    <div>
                      <span className="font-semibold text-indigo-700">Manager Access:</span>
                      <p className="mt-0.5 text-ink-secondary">
                        As manager, you can invite team members, assign leads, view team analytics, and manage workspace pipelines.
                      </p>
                    </div>
                  </div>

                  {createError && (
                    <div className="rounded-control border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs text-rose-700">
                      {createError}
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-3 pt-3 border-t border-line-default">
                    <Button
                      onClick={() => { setActiveFlow(null); setCreateError('') }}
                      type="button"
                      variant="outline"
                      disabled={isCreating}
                    >
                      Cancel
                    </Button>
                    <Button
                      className="bg-indigo-600 hover:bg-indigo-700"
                      disabled={isCreating}
                      type="submit"
                    >
                      {isCreating ? 'Creating Workspace…' : 'Create & Open Workspace'}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ─── SUB-FLOW: Join Workspace Form ───────────────────────────────── */}
          {activeFlow === 'join' && (
            <div className="mt-8 rounded-card border border-line-default bg-surface-default p-6 shadow-card animate-in fade-in zoom-in-95 duration-150 sm:p-8">
              <div className="flex items-center justify-between border-b border-line-default pb-4">
                <button
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-muted transition-colors hover:text-ink-primary"
                  onClick={() => { setActiveFlow(null); setJoinError('') }}
                  type="button"
                >
                  <ChevronLeft className="size-4" />
                  <span>Back to options</span>
                </button>

                <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                  Team Member Role
                </span>
              </div>

              <div className="mt-6">
                <div className="flex items-center gap-3">
                  <div className="grid size-10 place-items-center rounded-control bg-emerald-50 text-emerald-600">
                    <Users className="size-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-ink-primary">
                      Join a Workspace
                    </h2>
                    <p className="text-xs text-ink-muted">
                      Enter the invitation token shared by your workspace manager.
                    </p>
                  </div>
                </div>

                <form className="mt-6 space-y-4" onSubmit={handleJoinSubmit}>
                  <div>
                    <Input
                      autoFocus
                      label="Invitation Token"
                      name="inviteCode"
                      placeholder="Paste your invitation token here"
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value)}
                      required
                    />
                  </div>

                  <div className="flex items-start gap-2.5 rounded-control border border-emerald-100 bg-emerald-50/70 p-3 text-xs text-emerald-950">
                    <CheckCircle2 className="size-4 shrink-0 text-emerald-600 mt-0.5" />
                    <div>
                      <span className="font-semibold text-emerald-800">Team Member Access:</span>
                      <p className="mt-0.5 text-ink-secondary">
                        You will join as a <strong>Team Member</strong>, gaining access to shared CRM pipelines and collaborative AI tools.
                      </p>
                    </div>
                  </div>

                  {joinError && (
                    <div className="rounded-control border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs text-rose-700">
                      {joinError}
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-3 pt-3 border-t border-line-default">
                    <Button
                      onClick={() => { setActiveFlow(null); setJoinError('') }}
                      type="button"
                      variant="outline"
                      disabled={isJoining}
                    >
                      Cancel
                    </Button>
                    <Button
                      className="bg-emerald-600 hover:bg-emerald-700"
                      disabled={isJoining}
                      type="submit"
                    >
                      {isJoining ? 'Joining Workspace…' : 'Join & Open Workspace'}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ─── PRIMARY 3-OPTION ONBOARDING ─────────────────────────────────── */}
          {activeFlow === null && (
            <div className="mt-8 space-y-6">

              {/* 1. PERSONAL AREA CARD */}
              <div className="group relative overflow-hidden rounded-card border-2 border-blue-200/80 bg-gradient-to-br from-blue-50/60 via-surface-default to-surface-default p-6 shadow-card transition-all hover:border-brand-500 hover:shadow-floating">
                <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                  <div className="flex items-start gap-4">
                    <div className="grid size-12 shrink-0 place-items-center rounded-card bg-brand-600 text-white shadow-xs">
                      <User className="size-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2.5">
                        <h3 className="text-base font-semibold text-ink-primary">
                          Personal Area
                        </h3>
                        <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-brand-700">
                          Solo Owner
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-ink-muted sm:text-sm">
                        Start immediately with a private CRM workspace for your individual leads, deals, and personal AI sales tools.
                      </p>
                    </div>
                  </div>

                  <Button
                    className="w-full shrink-0 justify-center sm:w-auto"
                    onClick={handleSelectPersonal}
                    type="button"
                  >
                    <span>Open Personal Area</span>
                    <ArrowRight className="ml-1.5 size-4 transition-transform group-hover:translate-x-0.5" />
                  </Button>
                </div>
              </div>

              {/* 2 & 3. WORKSPACE ACTIONS: CREATE OR JOIN */}
              <div className="grid gap-4 sm:grid-cols-2">
                {/* Create Workspace Action Card */}
                <div
                  className="group flex flex-col justify-between rounded-card border border-line-default bg-surface-default p-5 shadow-card transition-all hover:border-indigo-300 hover:shadow-floating"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="grid size-10 place-items-center rounded-control bg-indigo-50 text-indigo-600 transition-colors group-hover:bg-indigo-600 group-hover:text-white">
                        <Building2 className="size-5" />
                      </div>
                      <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
                        Manager Role
                      </span>
                    </div>
                    <h3 className="mt-4 text-sm font-semibold text-ink-primary">
                      + Create a Workspace
                    </h3>
                    <p className="mt-1 text-xs text-ink-muted">
                      Set up a new organization. As creator, you will be the Workspace Manager/Owner with full administrative control.
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-line-default">
                    <Button
                      className="w-full justify-center border-line-strong bg-surface-default text-ink-primary hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-300 text-xs"
                      onClick={() => setActiveFlow('create')}
                      type="button"
                      variant="outline"
                    >
                      <Plus className="mr-1 size-3.5" />
                      <span>Create Workspace</span>
                    </Button>
                  </div>
                </div>

                {/* Join Workspace Action Card */}
                <div
                  className="group flex flex-col justify-between rounded-card border border-line-default bg-surface-default p-5 shadow-card transition-all hover:border-emerald-300 hover:shadow-floating"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="grid size-10 place-items-center rounded-control bg-emerald-50 text-emerald-600 transition-colors group-hover:bg-emerald-600 group-hover:text-white">
                        <Users className="size-5" />
                      </div>
                      <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                        Team Member
                      </span>
                    </div>
                    <h3 className="mt-4 text-sm font-semibold text-ink-primary">
                      Join with Invite Code
                    </h3>
                    <p className="mt-1 text-xs text-ink-muted">
                      Have an invite token from another organization? Enter it to join as a Team Member.
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-line-default">
                    <Button
                      className="w-full justify-center border-line-strong bg-surface-default text-ink-primary hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 text-xs"
                      onClick={() => setActiveFlow('join')}
                      type="button"
                      variant="outline"
                    >
                      <Mail className="mr-1 size-3.5" />
                      <span>Enter Invite Token</span>
                    </Button>
                  </div>
                </div>
              </div>

            </div>
          )}

        </div>
      </main>
    </div>
  )
}
