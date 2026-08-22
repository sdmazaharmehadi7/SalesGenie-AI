import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useWorkspace } from '@/context/WorkspaceContext'
import { useToast } from '@/context/ToastContext'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import {
  ArrowRight,
  Briefcase,
  Building2,
  Check,
  CheckCircle2,
  ChevronLeft,
  Crown,
  LogOut,
  Mail,
  Plus,
  RefreshCw,
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

// Initial mock data showcasing multi-role workspace architecture
const INITIAL_MOCK_WORKSPACES = [
  {
    id: 'ws-techscale',
    name: 'TechScale',
    type: 'team',
    role: 'manager',
    roleLabel: 'Manager',
    membersCount: 8,
    description: 'Enterprise AI & Sales Operations Hub',
    isOwner: true,
  },
  {
    id: 'ws-abccorp',
    name: 'ABC Corp',
    type: 'team',
    role: 'member',
    roleLabel: 'Team Member',
    membersCount: 24,
    description: 'Regional B2B Pipeline & Account Management',
    isOwner: false,
  },
]

const INITIAL_MOCK_INVITATIONS = [
  {
    id: 'inv-xyz',
    workspaceName: 'XYZ Corp',
    invitedBy: 'sarah.m@xyzcorp.io',
    role: 'member',
    roleLabel: 'Team Member',
    membersCount: 15,
    sentAt: '2 days ago',
  },
]

function OnboardingPage() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const { switchWorkspace, switchToPersonal, createWorkspace, joinWorkspace } = useWorkspace()
  const { showToast } = useToast()

  const displayName = user?.name || user?.email?.split('@')[0] || 'User'
  const initials = getInitials(displayName)

  // Workspaces state from localStorage (or defaults)
  const [workspaces, setWorkspaces] = useState(() => {
    try {
      const stored = localStorage.getItem('sg_user_workspaces')
      return stored ? JSON.parse(stored) : INITIAL_MOCK_WORKSPACES
    } catch {
      return INITIAL_MOCK_WORKSPACES
    }
  })

  // Pending invitations state from localStorage (or defaults)
  const [pendingInvitations, setPendingInvitations] = useState(() => {
    try {
      const stored = localStorage.getItem('sg_pending_invitations')
      return stored ? JSON.parse(stored) : INITIAL_MOCK_INVITATIONS
    } catch {
      return INITIAL_MOCK_INVITATIONS
    }
  })

  // Active sub-flow: null | 'create' | 'join'
  const [activeFlow, setActiveFlow] = useState(null)

  // Form states
  const [createName, setCreateName] = useState('')
  const [createCompanyName, setCreateCompanyName] = useState('')
  const [createDescription, setCreateDescription] = useState('')
  const [createError, setCreateError] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  const [inviteCode, setInviteCode] = useState('')
  const [joinError, setJoinError] = useState('')
  const [isJoining, setIsJoining] = useState(false)

  // Sync state helpers
  function saveWorkspaces(newList) {
    setWorkspaces(newList)
    localStorage.setItem('sg_user_workspaces', JSON.stringify(newList))
  }

  function saveInvitations(newList) {
    setPendingInvitations(newList)
    localStorage.setItem('sg_pending_invitations', JSON.stringify(newList))
  }

  // ─── Flow: Select Personal Area ─────────────────────────────────────────────
  function handleSelectPersonal() {
    switchToPersonal(displayName)
    showToast('Entered Personal Area!', 'success')
    navigate('/dashboard', { replace: true })
  }

  // ─── Flow: Select Existing Workspace ────────────────────────────────────────
  function handleSelectWorkspace(ws) {
    switchWorkspace(ws)
    showToast(`Switched to ${ws.name} as ${ws.roleLabel}!`, 'success')
    navigate('/dashboard', { replace: true })
  }

  // ─── Flow: Accept Invitation ────────────────────────────────────────────────
  function handleAcceptInvite(invitation) {
    const newWs = {
      id: `ws-${invitation.workspaceName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
      name: invitation.workspaceName,
      type: 'team',
      role: 'member',
      roleLabel: 'Team Member',
      membersCount: invitation.membersCount || 1,
      description: `Workspace joined via invite from ${invitation.invitedBy}`,
      isOwner: false,
    }

    const updatedWorkspaces = [...workspaces, newWs]
    const updatedInvitations = pendingInvitations.filter((i) => i.id !== invitation.id)

    saveWorkspaces(updatedWorkspaces)
    saveInvitations(updatedInvitations)

    switchWorkspace(newWs)
    showToast(`Accepted invitation! Switched to ${newWs.name} as Team Member.`, 'success')
    navigate('/dashboard', { replace: true })
  }

  // ─── Flow: Decline Invitation ────────────────────────────────────────────────
  function handleDeclineInvite(invitation) {
    const updated = pendingInvitations.filter((i) => i.id !== invitation.id)
    saveInvitations(updated)
    showToast(`Declined invitation to ${invitation.workspaceName}.`, 'info')
  }

  // ─── Flow: Create Workspace ──────────────────────────────────────────────────
  function handleCreateSubmit(e) {
    e.preventDefault()
    setCreateError('')

    if (!createName.trim()) {
      setCreateError('Please enter a workspace name.')
      return
    }

    setIsCreating(true)
    setTimeout(() => {
      const newWs = createWorkspace({
        name: createName.trim(),
        companyName: createCompanyName.trim() || createName.trim(),
        description: createDescription.trim(),
      })

      setIsCreating(false)
      showToast(`Workspace "${newWs.name}" created! You are the Manager.`, 'success')
      navigate('/dashboard', { replace: true })
    }, 300)
  }

  // ─── Flow: Join Workspace with Code ─────────────────────────────────────────
  function handleJoinSubmit(e) {
    e.preventDefault()
    setJoinError('')

    if (!inviteCode.trim()) {
      setJoinError('Please enter a valid invitation code or token.')
      return
    }

    setIsJoining(true)
    setTimeout(() => {
      const result = joinWorkspace({ inviteCode: inviteCode.trim() })
      if (!result.success) {
        setJoinError(result.error)
        setIsJoining(false)
        return
      }

      setIsJoining(false)
      showToast(`Joined ${result.workspace.name} as Team Member!`, 'success')
      navigate('/dashboard', { replace: true })
    }, 300)
  }

  // ─── Demo State Toggle (Empty vs Multi-Workspace) ───────────────────────────
  function handleResetDemoState(empty = false) {
    if (empty) {
      saveWorkspaces([])
      saveInvitations([])
      showToast('State switched to: New User (Zero Workspaces)', 'info')
    } else {
      saveWorkspaces(INITIAL_MOCK_WORKSPACES)
      saveInvitations(INITIAL_MOCK_INVITATIONS)
      showToast('State switched to: Existing Workspaces & Invites', 'info')
    }
  }

  const hasWorkspaces = workspaces.length > 0
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
              {user?.email || displayName}
            </span>
          </div>

          <button
            aria-label="Sign out"
            className="flex items-center gap-1.5 rounded-control px-2.5 py-1.5 text-xs font-medium text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink-primary"
            onClick={logout}
            type="button"
          >
            <LogOut className="size-3.5" />
            <span>Sign out</span>
          </button>
        </div>
      </header>

      {/* ─── Main Content ────────────────────────────────────────────────────── */}
      <main className="flex flex-1 items-center justify-center p-4 sm:p-6 lg:p-12">
        <div className="w-full max-w-4xl">
          
          {/* Header Title */}
          <div className="mb-8 text-center sm:mb-10">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">
              <Sparkles className="size-3.5 text-brand-500" />
              <span>Workspace Hub</span>
            </div>
            <h1 className="mt-3 text-2xl font-bold tracking-tight text-ink-primary sm:text-3xl lg:text-4xl">
              How do you want to use SalesGenie?
            </h1>
            <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-ink-muted sm:text-base">
              Every SalesGenie user has a private Personal Area and can participate in team workspaces with workspace-specific roles.
            </p>
          </div>

          {/* ─── Form Views (Create / Join Modals) ──────────────────────────────── */}
          {activeFlow === 'create' && (
            <div className="mx-auto max-w-lg rounded-card border border-line-default bg-surface-default p-6 sm:p-8 shadow-card">
              <button
                className="mb-6 inline-flex items-center gap-1 text-xs font-medium text-ink-muted hover:text-ink-primary"
                onClick={() => setActiveFlow(null)}
                type="button"
              >
                <ChevronLeft className="size-4" />
                <span>Back to workspace list</span>
              </button>

              <div className="flex items-center gap-3">
                <div className="grid size-10 place-items-center rounded-control bg-indigo-50 text-indigo-600">
                  <Building2 className="size-5" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-ink-primary">
                    Create a New Workspace
                  </h2>
                  <p className="text-xs text-ink-muted">
                    You will be the Manager/Owner of this workspace
                  </p>
                </div>
              </div>

              <form className="mt-6 space-y-4" onSubmit={handleCreateSubmit}>
                <div>
                  <Input
                    autoFocus
                    label="Workspace Name"
                    name="workspaceName"
                    placeholder="e.g. North America Enterprise Sales"
                    value={createName}
                    onChange={(e) => setCreateName(e.target.value)}
                    required
                  />
                  <p className="mt-1 text-[11px] text-ink-muted">
                    This name will appear in your sidebar navigation and notifications.
                  </p>
                </div>

                <div>
                  <Input
                    label="Company / Team Name"
                    name="companyName"
                    placeholder="e.g. Acme Corporation"
                    value={createCompanyName}
                    onChange={(e) => setCreateCompanyName(e.target.value)}
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-ink-secondary" htmlFor="onboarding-desc">
                    Description <span className="text-xs text-ink-muted font-normal">(Optional)</span>
                  </label>
                  <textarea
                    className="flex min-h-[72px] w-full rounded-control border border-line-strong bg-surface-default p-3 text-sm text-ink-primary focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                    id="onboarding-desc"
                    name="description"
                    placeholder="e.g. Inbound pipeline, outbound sequences, and revenue forecasting."
                    rows={2}
                    value={createDescription}
                    onChange={(e) => setCreateDescription(e.target.value)}
                  />
                </div>

                <div className="flex items-start gap-2.5 rounded-control border border-indigo-100 bg-indigo-50/70 p-3 text-xs text-indigo-950">
                  <Crown className="size-4 shrink-0 text-indigo-600 mt-0.5" />
                  <div>
                    <span className="font-semibold text-indigo-700">Manager / Owner Role:</span>
                    <p className="mt-0.5 text-ink-secondary">
                      As creator, you will have full Manager privileges to invite team members, assign roles, and configure CRM integrations.
                    </p>
                  </div>
                </div>

                {createError && (
                  <div className="rounded-control border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-700">
                    {createError}
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <Button
                    className="flex-1 justify-center"
                    onClick={() => setActiveFlow(null)}
                    type="button"
                    variant="outline"
                  >
                    Cancel
                  </Button>
                  <Button
                    className="flex-1 justify-center bg-indigo-600 hover:bg-indigo-700"
                    disabled={isCreating}
                    type="submit"
                  >
                    {isCreating ? 'Creating…' : 'Create & Enter'}
                  </Button>
                </div>
              </form>
            </div>
          )}

          {activeFlow === 'join' && (
            <div className="mx-auto max-w-lg rounded-card border border-line-default bg-surface-default p-6 sm:p-8 shadow-card">
              <button
                className="mb-6 inline-flex items-center gap-1 text-xs font-medium text-ink-muted hover:text-ink-primary"
                onClick={() => setActiveFlow(null)}
                type="button"
              >
                <ChevronLeft className="size-4" />
                <span>Back to workspace list</span>
              </button>

              <div className="flex items-center gap-3">
                <div className="grid size-10 place-items-center rounded-control bg-emerald-50 text-emerald-600">
                  <Users className="size-5" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-ink-primary">
                    Join a Workspace
                  </h2>
                  <p className="text-xs text-ink-muted">
                    Enter the invitation code shared by your workspace manager
                  </p>
                </div>
              </div>

              <form className="mt-6 space-y-4" onSubmit={handleJoinSubmit}>
                <div>
                  <Input
                    autoFocus
                    label="Invitation Code or Token"
                    name="inviteCode"
                    placeholder="e.g. WS-ALPHA-8492 or INV-SALES-2026"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    required
                  />
                  <p className="mt-1 text-[11px] text-ink-muted">
                    Enter the code or invitation link provided by your workspace manager.
                  </p>
                </div>

                {/* Sample Invite Codes Pills */}
                <div>
                  <span className="text-[11px] font-medium text-ink-muted">Try sample invite codes:</span>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {['WS-ALPHA-8492', 'INV-SALES-2026', 'XYZ-CORP'].map((code) => (
                      <button
                        key={code}
                        className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50/70 px-2.5 py-0.5 text-xs font-medium text-emerald-800 transition-colors hover:bg-emerald-100 hover:border-emerald-300"
                        onClick={() => { setInviteCode(code); setJoinError('') }}
                        type="button"
                      >
                        <span>{code}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-start gap-2.5 rounded-control border border-emerald-100 bg-emerald-50/70 p-3 text-xs text-emerald-950">
                  <CheckCircle2 className="size-4 shrink-0 text-emerald-600 mt-0.5" />
                  <div>
                    <span className="font-semibold text-emerald-800">Team Member Access:</span>
                    <p className="mt-0.5 text-ink-secondary">
                      You will join this workspace as a <strong>Team Member</strong> with shared deal pipelines and collaborative AI forecasting tools.
                    </p>
                  </div>
                </div>

                {joinError && (
                  <div className="rounded-control border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-700">
                    {joinError}
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <Button
                    className="flex-1 justify-center"
                    onClick={() => setActiveFlow(null)}
                    type="button"
                    variant="outline"
                  >
                    Cancel
                  </Button>
                  <Button
                    className="flex-1 justify-center bg-emerald-600 hover:bg-emerald-700"
                    disabled={isJoining}
                    type="submit"
                  >
                    {isJoining ? 'Joining…' : 'Join Workspace'}
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* ─── Main Hub View (When no form is active) ─────────────────────────── */}
          {!activeFlow && (
            <div className="space-y-8">

              {/* 1. PERSONAL AREA (Always Available to Every User) */}
              <div>
                <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-ink-muted">
                  Personal Area
                </h2>
                <div className="group relative flex flex-col items-start justify-between gap-4 rounded-card border border-line-default bg-surface-default p-5 shadow-card transition-all hover:border-brand-300 hover:shadow-floating sm:flex-row sm:items-center sm:p-6">
                  <div className="flex items-start gap-4">
                    <div className="grid size-12 shrink-0 place-items-center rounded-control bg-blue-50 text-brand-600 transition-colors group-hover:bg-brand-500 group-hover:text-white">
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

              {/* 2. MY WORKSPACES SECTION (If user has existing workspaces) */}
              {hasWorkspaces && (
                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-ink-muted">
                      My Workspaces ({workspaces.length})
                    </h2>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    {workspaces.map((ws) => {
                      const isManager = ws.role === 'manager' || ws.role === 'owner'
                      return (
                        <div
                          key={ws.id}
                          className="group flex flex-col justify-between rounded-card border border-line-default bg-surface-default p-4 shadow-card transition-all hover:-translate-y-0.5 hover:border-line-strong hover:shadow-floating"
                        >
                          <div>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2.5">
                                <div className={`grid size-9 place-items-center rounded-control text-xs font-bold ${
                                  isManager ? 'bg-indigo-50 text-indigo-700' : 'bg-emerald-50 text-emerald-700'
                                }`}>
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

                              {/* Workspace-Specific Role Badge */}
                              <span
                                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                  isManager
                                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                }`}
                              >
                                {isManager ? (
                                  <Crown className="size-3" />
                                ) : (
                                  <Users className="size-3" />
                                )}
                                <span>{ws.roleLabel || (isManager ? 'Manager' : 'Team Member')}</span>
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
                              variant={isManager ? 'primary' : 'outline'}
                            >
                              <span>Enter as {ws.roleLabel}</span>
                              <ArrowRight className="ml-1.5 size-3.5" />
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* 3. PENDING INVITATIONS SECTION (If user has pending invites) */}
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
                                {inv.workspaceName}
                              </h3>
                              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
                                Role: Team Member
                              </span>
                            </div>
                            <p className="mt-0.5 text-xs text-ink-secondary">
                              Invited by <span className="font-medium text-ink-primary">{inv.invitedBy}</span> • {inv.sentAt || 'Recently'}
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

              {/* 4. WORKSPACE ACTIONS: CREATE OR JOIN WITH CODE */}
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-ink-muted">
                    {hasWorkspaces ? 'Add or Join Workspaces' : 'Get Started'}
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
                        Have an invite code or link from another organization? Enter it to join as a Team Member.
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
                        <span>Enter Invite Code</span>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* ─── Demo Tester Bar (Quick state toggling for testing) ─────────── */}
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-card border border-dashed border-line-strong bg-surface-muted/50 p-3 text-xs text-ink-muted">
                <span className="font-medium">
                  🧪 Frontend Demo State Controls:
                </span>
                <div className="flex items-center gap-2">
                  <button
                    className={`rounded-control px-2 py-1 text-xs font-medium transition-colors ${
                      hasWorkspaces ? 'bg-brand-600 text-white' : 'bg-surface-default text-ink-secondary hover:bg-surface-muted'
                    }`}
                    onClick={() => handleResetDemoState(false)}
                    type="button"
                  >
                    Multi-Workspace User Mode
                  </button>
                  <button
                    className={`rounded-control px-2 py-1 text-xs font-medium transition-colors ${
                      !hasWorkspaces ? 'bg-brand-600 text-white' : 'bg-surface-default text-ink-secondary hover:bg-surface-muted'
                    }`}
                    onClick={() => handleResetDemoState(true)}
                    type="button"
                  >
                    Zero-Workspace New User Mode
                  </button>
                </div>
              </div>

            </div>
          )}

        </div>
      </main>
    </div>
  )
}

export default OnboardingPage
