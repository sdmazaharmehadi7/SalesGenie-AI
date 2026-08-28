import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useWorkspace } from '@/context/WorkspaceContext'
import { useToast } from '@/context/ToastContext'
import {
  listMyPendingInvitations,
  acceptInvitation,
  rejectInvitation,
} from '@/services/api/workspaces'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import {
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  ChevronLeft,
  Crown,
  LogOut,
  Mail,
  Plus,
  Sparkles,
  User,
  Users,
  X,
} from '@/components/ui/icons'

function getInitials(name) {
  if (!name) return 'U'
  const parts = name.trim().split(/\s+/)
  const first = parts[0]?.[0] || ''
  const last = parts.length > 1 ? parts[parts.length - 1][0] : ''
  return (first + last).toUpperCase() || 'U'
}

export default function WorkspaceHubPage({ initialFlow = null }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuth()
  const {
    workspaces,
    switchWorkspace,
    switchToPersonal,
    createWorkspace,
    joinWorkspace,
    refreshWorkspaces,
  } = useWorkspace()
  const { showToast } = useToast()

  const displayName = user?.name || user?.email?.split('@')[0] || 'User'
  const initials = getInitials(displayName)

  const [pendingInvitations, setPendingInvitations] = useState([])
  const [loadingInvitations, setLoadingInvitations] = useState(false)

  // Determine flow from prop or pathname
  const computeFlow = () => {
    if (initialFlow) return initialFlow
    if (location.pathname === '/workspaces/create') return 'create'
    if (location.pathname === '/workspaces/join') return 'join'
    return null
  }

  const [activeFlow, setActiveFlow] = useState(computeFlow)

  useEffect(() => {
    setActiveFlow(computeFlow())
  }, [location.pathname, initialFlow])

  // Form states
  const [createName, setCreateName] = useState('')
  const [createDescription, setCreateDescription] = useState('')
  const [createError, setCreateError] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  const [inviteCode, setInviteCode] = useState('')
  const [joinError, setJoinError] = useState('')
  const [isJoining, setIsJoining] = useState(false)

  const loadInvitations = useCallback(async () => {
    setLoadingInvitations(true)
    try {
      const data = await listMyPendingInvitations()
      setPendingInvitations(data || [])
    } catch (err) {
      console.error('Failed to load pending invitations:', err)
    } finally {
      setLoadingInvitations(false)
    }
  }, [])

  useEffect(() => {
    refreshWorkspaces()
    loadInvitations()
  }, [refreshWorkspaces, loadInvitations])

  // ─── Flow: Select Personal Area ─────────────────────────────────────────────
  function handleSelectPersonal() {
    switchToPersonal(displayName)
    if (user?.id) {
      localStorage.setItem(`sg_onboarded_${user.id}`, 'true')
    }
    showToast('Entered Personal Area!', 'success')
    navigate('/personal', { replace: true })
  }

  // ─── Flow: Select Existing Workspace ────────────────────────────────────────
  function handleSelectWorkspace(ws) {
    switchWorkspace(ws)
    if (user?.id) {
      localStorage.setItem(`sg_onboarded_${user.id}`, 'true')
    }
    showToast(`Switched to ${ws.name} as ${ws.roleLabel}!`, 'success')
    navigate(`/workspace/${ws.id}`, { replace: true })
  }

  // ─── Flow: Accept Invitation ────────────────────────────────────────────────
  async function handleAcceptInvite(invitation) {
    try {
      const result = await acceptInvitation(invitation.token)
      showToast(`Accepted invitation! Joined ${result.workspace_name} as Team Member.`, 'success')
      await refreshWorkspaces()
      setPendingInvitations((prev) => prev.filter((i) => i.id !== invitation.id))
      const targetWs = {
        id: result.workspace_id,
        name: result.workspace_name,
        type: result.workspace_type || 'team',
        role: result.role || 'team_member',
        roleLabel: result.is_manager ? 'Manager' : 'Team Member',
        isOwner: result.is_manager,
        membersCount: 1,
      }
      switchWorkspace(targetWs)
      if (user?.id) {
        localStorage.setItem(`sg_onboarded_${user.id}`, 'true')
      }
      navigate(`/workspace/${result.workspace_id}`, { replace: true })
    } catch (err) {
      const msg = err?.response?.data?.detail || 'Failed to accept invitation.'
      showToast(msg, 'error')
    }
  }

  // ─── Flow: Decline Invitation ────────────────────────────────────────────────
  async function handleDeclineInvite(invitation) {
    try {
      await rejectInvitation(invitation.token)
      setPendingInvitations((prev) => prev.filter((i) => i.id !== invitation.id))
      showToast(`Declined invitation to ${invitation.workspace_name}.`, 'info')
    } catch (err) {
      const msg = err?.response?.data?.detail || 'Failed to decline invitation.'
      showToast(msg, 'error')
    }
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

  function handleBackToHub() {
    setActiveFlow(null)
    setCreateError('')
    setJoinError('')
    if (location.pathname !== '/workspace-hub') {
      navigate('/workspace-hub')
    }
  }

  const managedWorkspaces = workspaces.filter((w) => w.role === 'manager' || w.role === 'owner')
  const memberWorkspaces = workspaces.filter((w) => w.role !== 'manager' && w.role !== 'owner')
  const hasInvitations = pendingInvitations.length > 0

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
              <span>Workspace Management & Access Hub</span>
            </div>

            <h1 className="mt-3 text-2xl font-bold tracking-tight text-ink-primary sm:text-3xl">
              Welcome back, {displayName}
            </h1>

            <p className="mx-auto mt-2 max-w-xl text-sm text-ink-muted">
              Choose your work context. Personal Area remains completely private, while team workspaces provide collaborative CRM pipelines and AI analytics.
            </p>
          </div>

          {/* ─── SUB-FLOW: Create Workspace Form ─────────────────────────────── */}
          {activeFlow === 'create' && (
            <div className="mt-8 rounded-card border border-line-default bg-surface-default p-6 shadow-card animate-in fade-in zoom-in-95 duration-150 sm:p-8">
              <div className="flex items-center justify-between border-b border-line-default pb-4">
                <button
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-muted transition-colors hover:text-ink-primary"
                  onClick={handleBackToHub}
                  type="button"
                >
                  <ChevronLeft className="size-4" />
                  <span>Back to workspace list</span>
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
                    <label className="mb-1.5 block text-sm font-medium text-ink-secondary" htmlFor="hub-create-desc">
                      Description <span className="text-xs text-ink-muted font-normal">(Optional)</span>
                    </label>
                    <textarea
                      className="flex min-h-[72px] w-full rounded-control border border-line-strong bg-surface-default p-3 text-sm text-ink-primary focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                      id="hub-create-desc"
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
                      onClick={handleBackToHub}
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
                  onClick={handleBackToHub}
                  type="button"
                >
                  <ChevronLeft className="size-4" />
                  <span>Back to workspace list</span>
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
                      onClick={handleBackToHub}
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

          {/* ─── PRIMARY SELECTION DASHBOARD ─────────────────────────────────── */}
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
                        Private workspace for your individual CRM leads, deal pipeline, and personal AI sales tools.
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

              {/* 2. MANAGED WORKSPACES SECTION */}
              {managedWorkspaces.length > 0 && (
                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-700">
                      Managed Workspaces ({managedWorkspaces.length})
                    </h2>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    {managedWorkspaces.map((ws) => (
                      <div
                        key={ws.id}
                        className="group flex flex-col justify-between rounded-card border border-line-default bg-surface-default p-4 shadow-card transition-all hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-floating"
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <div className="grid size-9 place-items-center rounded-control text-xs font-bold bg-indigo-50 text-indigo-700">
                                {ws.name.slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <h3 className="text-sm font-semibold text-ink-primary">
                                  {ws.name}
                                </h3>
                                <span className="text-xs text-ink-muted">
                                  {ws.membersCount ? `${ws.membersCount} members` : 'Team workspace'}
                                </span>
                              </div>
                            </div>

                            <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
                              <Crown className="size-3" />
                              <span>Manager</span>
                            </span>
                          </div>

                          {ws.description && (
                            <p className="mt-2.5 text-xs text-ink-muted line-clamp-2">
                              {ws.description}
                            </p>
                          )}
                        </div>

                        <div className="mt-4 pt-3 border-t border-line-default">
                          <Button
                            className="w-full justify-center text-xs py-1.5"
                            onClick={() => handleSelectWorkspace(ws)}
                            type="button"
                            variant="primary"
                          >
                            <span>Enter as Manager</span>
                            <ArrowRight className="ml-1.5 size-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 3. MEMBER WORKSPACES SECTION */}
              {memberWorkspaces.length > 0 && (
                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                      Member Workspaces ({memberWorkspaces.length})
                    </h2>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    {memberWorkspaces.map((ws) => (
                      <div
                        key={ws.id}
                        className="group flex flex-col justify-between rounded-card border border-line-default bg-surface-default p-4 shadow-card transition-all hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-floating"
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <div className="grid size-9 place-items-center rounded-control text-xs font-bold bg-emerald-50 text-emerald-700">
                                {ws.name.slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <h3 className="text-sm font-semibold text-ink-primary">
                                  {ws.name}
                                </h3>
                                <span className="text-xs text-ink-muted">
                                  {ws.membersCount ? `${ws.membersCount} members` : 'Team workspace'}
                                </span>
                              </div>
                            </div>

                            <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <Users className="size-3" />
                              <span>Team Member</span>
                            </span>
                          </div>

                          {ws.description && (
                            <p className="mt-2.5 text-xs text-ink-muted line-clamp-2">
                              {ws.description}
                            </p>
                          )}
                        </div>

                        <div className="mt-4 pt-3 border-t border-line-default">
                          <Button
                            className="w-full justify-center text-xs py-1.5"
                            onClick={() => handleSelectWorkspace(ws)}
                            type="button"
                            variant="outline"
                          >
                            <span>Enter as Team Member</span>
                            <ArrowRight className="ml-1.5 size-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 4. PENDING INVITATIONS SECTION */}
              {hasInvitations && (
                <div>
                  <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-amber-700">
                    Pending Invitations ({pendingInvitations.length})
                  </h2>

                  <div className="space-y-3">
                    {pendingInvitations.map((inv) => (
                      <div
                        key={inv.id}
                        className="flex flex-col items-start justify-between gap-3 rounded-card border border-amber-200 bg-amber-50/50 p-4 sm:flex-row sm:items-center"
                      >
                        <div className="flex items-start gap-3">
                          <div className="grid size-10 shrink-0 place-items-center rounded-control bg-amber-100 text-amber-800">
                            <Mail className="size-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-sm font-semibold text-ink-primary">
                                {inv.workspace_name}
                              </h3>
                              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
                                Role: {inv.role === 'manager' ? 'Manager' : 'Team Member'}
                              </span>
                            </div>
                            <p className="mt-0.5 text-xs text-ink-secondary">
                              Invited by <span className="font-medium text-ink-primary">{inv.invited_by_name || inv.invited_by_email}</span>
                            </p>
                          </div>
                        </div>

                        <div className="flex w-full items-center gap-2 sm:w-auto">
                          <Button
                            className="flex-1 justify-center border-amber-300 bg-white text-ink-secondary hover:bg-amber-100/50 text-xs sm:flex-none"
                            onClick={() => handleDeclineInvite(inv)}
                            type="button"
                            variant="outline"
                          >
                            <X className="mr-1 size-3.5" />
                            <span>Decline</span>
                          </Button>
                          <Button
                            className="flex-1 justify-center bg-emerald-600 hover:bg-emerald-700 text-xs sm:flex-none"
                            onClick={() => handleAcceptInvite(inv)}
                            type="button"
                          >
                            <Check className="mr-1 size-3.5" />
                            <span>Accept & Join</span>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 5. WORKSPACE ACTIONS: CREATE OR JOIN */}
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-ink-muted">
                    Add or Join Workspaces
                  </h2>
                </div>

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
                        onClick={() => navigate('/workspaces/create')}
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
                        onClick={() => navigate('/workspaces/join')}
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

            </div>
          )}

        </div>
      </main>
    </div>
  )
}
