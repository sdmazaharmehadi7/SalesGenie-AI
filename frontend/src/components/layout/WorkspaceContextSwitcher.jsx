import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWorkspace } from '@/context/WorkspaceContext'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import {
  Building2,
  Check,
  ChevronDown,
  Crown,
  Plus,
  Sparkles,
  User,
  Users,
} from '@/components/ui/icons'
import CreateWorkspaceModal from '@/components/layout/CreateWorkspaceModal'
import JoinWorkspaceModal from '@/components/layout/JoinWorkspaceModal'

export default function WorkspaceContextSwitcher({ isCollapsed = false, inNavbar = false }) {
  const [isOpen, setIsOpen] = useState(false)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false)
  const menuRef = useRef(null)
  const navigate = useNavigate()
  const { user } = useAuth()
  const { showToast } = useToast()
  const { activeWorkspace, isPersonal, isManager, switchWorkspace, switchToPersonal, workspaces, refreshWorkspaces } = useWorkspace()

  useEffect(() => {
    refreshWorkspaces()
  }, [refreshWorkspaces, isOpen])

  useEffect(() => {
    function closeOnOutsideClick(event) {
      if (!menuRef.current?.contains(event.target)) {
        setIsOpen(false)
      }
    }
    function closeOnEscape(event) {
      if (event.key === 'Escape') setIsOpen(false)
    }

    document.addEventListener('mousedown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [])

  function handleSelectPersonal() {
    switchToPersonal(user?.name || user?.email?.split('@')[0])
    setIsOpen(false)
    showToast('Switched to Personal Area (Private)', 'success')
  }

  function handleSelectWorkspace(ws) {
    switchWorkspace(ws)
    setIsOpen(false)
    showToast(`Switched to ${ws.name} as ${ws.roleLabel || ws.role}`, 'success')
  }

  function handleGoToHub() {
    setIsOpen(false)
    navigate('/onboarding')
  }

  const displayName = activeWorkspace?.name || (isPersonal ? 'Personal Area' : 'Workspace')

  // TopNavbar compact pill mode
  if (inNavbar) {
    return (
      <div className="relative" ref={menuRef}>
        <button
          aria-expanded={isOpen}
          aria-haspopup="menu"
          aria-label="Switch workspace context"
          className="flex items-center gap-2 rounded-control border border-line-default bg-surface-default px-2.5 py-1.5 text-xs font-medium text-ink-primary shadow-xs transition-colors hover:bg-surface-muted hover:border-line-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-focus"
          onClick={() => setIsOpen((prev) => !prev)}
          type="button"
        >
          {isPersonal ? (
            <span className="grid size-4 place-items-center rounded-full bg-brand-100 text-brand-600">
              <User className="size-2.5" />
            </span>
          ) : (
            <span className={`grid size-4 place-items-center rounded-full text-[10px] font-bold ${
              isManager ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'
            }`}>
              {displayName.slice(0, 1).toUpperCase()}
            </span>
          )}

          <span className="max-w-[120px] truncate font-semibold sm:max-w-[180px]">
            {displayName}
          </span>

          <span className={`hidden rounded px-1.5 py-0.2 text-[10px] font-medium sm:inline ${
            isPersonal
              ? 'bg-blue-50 text-brand-700 border border-blue-200'
              : isManager
              ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
          }`}>
            {isPersonal ? 'Private Area' : isManager ? '👑 Manager' : '👥 Member'}
          </span>

          <ChevronDown className="size-3 text-ink-muted" />
        </button>

        {isOpen && (
          <div
            className="absolute left-0 top-[calc(100%+0.5rem)] z-50 w-72 rounded-card border border-line-default bg-surface-default p-1.5 shadow-floating animate-in fade-in zoom-in-95 duration-100"
            role="menu"
          >
            {/* Header */}
            <div className="border-b border-line-default px-3 py-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">
                Active Context
              </p>
              <p className="text-xs font-semibold text-ink-primary truncate mt-0.5">
                {displayName}
              </p>
            </div>

            {/* Switch to Personal Area */}
            <div className="py-1">
              <button
                className={`flex w-full items-center justify-between gap-2.5 rounded-control px-2.5 py-2 text-xs text-left transition-colors ${
                  isPersonal ? 'bg-brand-50 text-brand-700 font-semibold' : 'text-ink-secondary hover:bg-surface-muted hover:text-ink-primary'
                }`}
                onClick={handleSelectPersonal}
                role="menuitem"
                type="button"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="grid size-6 shrink-0 place-items-center rounded-control bg-blue-100 text-brand-600">
                    <User className="size-3.5" />
                  </div>
                  <div className="truncate">
                    <p className="font-medium text-ink-primary">Personal Area</p>
                    <p className="text-[10px] text-ink-muted">Private CRM & AI tools (Solo)</p>
                  </div>
                </div>
                {isPersonal && <Check className="size-4 shrink-0 text-brand-600" />}
              </button>
            </div>

            {/* Managed Workspaces Section (Manager/Owner) */}
            {workspaces.filter((w) => w.role === 'manager' || w.role === 'owner').length > 0 && (
              <div className="border-t border-line-default pt-1.5 pb-1">
                <div className="flex items-center justify-between px-2.5 py-0.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-700">
                    Managed Workspaces
                  </p>
                  <span className="text-[10px] font-medium text-indigo-600">Manager / Owner</span>
                </div>
                {workspaces
                  .filter((w) => w.role === 'manager' || w.role === 'owner')
                  .map((ws) => {
                    const isSelected = activeWorkspace?.id === ws.id
                    return (
                      <button
                        key={ws.id}
                        className={`flex w-full items-center justify-between gap-2.5 rounded-control px-2.5 py-2 text-xs text-left transition-colors ${
                          isSelected ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-ink-secondary hover:bg-surface-muted hover:text-ink-primary'
                        }`}
                        onClick={() => handleSelectWorkspace(ws)}
                        role="menuitem"
                        type="button"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="grid size-6 shrink-0 place-items-center rounded-control bg-indigo-100 text-indigo-700 text-[10px] font-bold">
                            {ws.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="truncate">
                            <p className="font-medium text-ink-primary">{ws.name}</p>
                            <span className="inline-flex items-center gap-0.5 text-[10px] text-indigo-600">
                              👑 Manager
                            </span>
                          </div>
                        </div>
                        {isSelected && <Check className="size-4 shrink-0 text-indigo-600" />}
                      </button>
                    )
                  })}
              </div>
            )}

            {/* Team Member Workspaces Section */}
            {workspaces.filter((w) => w.role !== 'manager' && w.role !== 'owner').length > 0 && (
              <div className="border-t border-line-default pt-1.5 pb-1">
                <div className="flex items-center justify-between px-2.5 py-0.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                    Member Workspaces
                  </p>
                  <span className="text-[10px] font-medium text-emerald-600">Team Member</span>
                </div>
                {workspaces
                  .filter((w) => w.role !== 'manager' && w.role !== 'owner')
                  .map((ws) => {
                    const isSelected = activeWorkspace?.id === ws.id
                    return (
                      <button
                        key={ws.id}
                        className={`flex w-full items-center justify-between gap-2.5 rounded-control px-2.5 py-2 text-xs text-left transition-colors ${
                          isSelected ? 'bg-emerald-50 text-emerald-700 font-semibold' : 'text-ink-secondary hover:bg-surface-muted hover:text-ink-primary'
                        }`}
                        onClick={() => handleSelectWorkspace(ws)}
                        role="menuitem"
                        type="button"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="grid size-6 shrink-0 place-items-center rounded-control bg-emerald-100 text-emerald-700 text-[10px] font-bold">
                            {ws.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="truncate">
                            <p className="font-medium text-ink-primary">{ws.name}</p>
                            <span className="inline-flex items-center gap-0.5 text-[10px] text-emerald-600">
                              👥 Team Member
                            </span>
                          </div>
                        </div>
                        {isSelected && <Check className="size-4 shrink-0 text-emerald-600" />}
                      </button>
                    )
                  })}
              </div>
            )}

            {/* Workspace Hub Footer */}
            <div className="border-t border-line-default pt-1 space-y-0.5">
              <button
                className="flex w-full items-center gap-2 rounded-control px-2.5 py-1.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 transition-colors"
                onClick={() => { setIsOpen(false); setIsCreateModalOpen(true) }}
                role="menuitem"
                type="button"
              >
                <Plus className="size-3.5" />
                <span>+ Create a Workspace</span>
              </button>
              <button
                className="flex w-full items-center gap-2 rounded-control px-2.5 py-1.5 text-xs font-semibold text-emerald-600 hover:bg-emerald-50 transition-colors"
                onClick={() => { setIsOpen(false); setIsJoinModalOpen(true) }}
                role="menuitem"
                type="button"
              >
                <Users className="size-3.5" />
                <span>Join with Invite Code</span>
              </button>
              <button
                className="flex w-full items-center gap-2 rounded-control px-2.5 py-1.5 text-xs font-medium text-ink-muted hover:bg-surface-muted hover:text-ink-primary transition-colors"
                onClick={handleGoToHub}
                role="menuitem"
                type="button"
              >
                <Building2 className="size-3.5" />
                <span>Workspace Hub (All & Invites)</span>
              </button>
            </div>
          </div>
        )}

        <CreateWorkspaceModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
        />

        <JoinWorkspaceModal
          isOpen={isJoinModalOpen}
          onClose={() => setIsJoinModalOpen(false)}
        />
      </div>
    )
  }

  // Sidebar Header Widget
  return (
    <div className="relative border-b border-line-default p-2.5" ref={menuRef}>
      <button
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label="Switch workspace context"
        className={`group flex w-full items-center gap-2.5 rounded-control p-2 text-left transition-all ${
          isPersonal
            ? 'bg-blue-50/70 hover:bg-blue-100/70 border border-blue-200/80'
            : isManager
            ? 'bg-indigo-50/70 hover:bg-indigo-100/70 border border-indigo-200/80'
            : 'bg-emerald-50/70 hover:bg-emerald-100/70 border border-emerald-200/80'
        } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-focus`}
        onClick={() => setIsOpen((prev) => !prev)}
        type="button"
      >
        <div className={`grid size-8 shrink-0 place-items-center rounded-control ${
          isPersonal
            ? 'bg-brand-600 text-white'
            : isManager
            ? 'bg-indigo-600 text-white'
            : 'bg-emerald-600 text-white'
        }`}>
          {isPersonal ? (
            <User className="size-4" />
          ) : (
            <span className="text-xs font-bold">{displayName.slice(0, 2).toUpperCase()}</span>
          )}
        </div>

        {!isCollapsed && (
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-1">
              <span className="truncate text-xs font-bold text-ink-primary">
                {displayName}
              </span>
              <ChevronDown className={`size-3.5 text-ink-muted transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`inline-block size-1.5 rounded-full ${
                isPersonal ? 'bg-blue-500' : isManager ? 'bg-indigo-500' : 'bg-emerald-500'
              }`} />
              <span className="truncate text-[10px] font-medium text-ink-secondary">
                {isPersonal ? 'Personal (Private)' : isManager ? '👑 Manager' : '👥 Team Member'}
              </span>
            </div>
          </div>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className="absolute left-2 right-2 top-[calc(100%+0.25rem)] z-50 rounded-card border border-line-default bg-surface-default p-1.5 shadow-floating"
          role="menu"
        >
          <div className="px-2.5 py-1.5 border-b border-line-default">
            <p className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">
              Select Workspace
            </p>
          </div>

          <div className="py-1">
            {/* Personal Area Option */}
            <button
              className={`flex w-full items-center justify-between gap-2 rounded-control px-2.5 py-2 text-xs text-left transition-colors ${
                isPersonal ? 'bg-brand-50 text-brand-700 font-semibold' : 'text-ink-secondary hover:bg-surface-muted hover:text-ink-primary'
              }`}
              onClick={handleSelectPersonal}
              role="menuitem"
              type="button"
            >
              <div className="flex items-center gap-2 min-w-0">
                <User className="size-3.5 shrink-0 text-brand-600" />
                <div className="truncate">
                  <p className="font-medium text-ink-primary">Personal Area</p>
                  <p className="text-[10px] text-ink-muted">Private CRM & AI (Solo)</p>
                </div>
              </div>
              {isPersonal && <Check className="size-3.5 shrink-0 text-brand-600" />}
            </button>

            {/* Managed Workspaces Section */}
            {workspaces.filter((w) => w.role === 'manager' || w.role === 'owner').length > 0 && (
              <div className="border-t border-line-default pt-1.5 pb-1">
                <p className="px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-indigo-700">
                  Manager / Owner
                </p>
                {workspaces
                  .filter((w) => w.role === 'manager' || w.role === 'owner')
                  .map((ws) => {
                    const isSelected = activeWorkspace?.id === ws.id
                    return (
                      <button
                        key={ws.id}
                        className={`flex w-full items-center justify-between gap-2 rounded-control px-2.5 py-2 text-xs text-left transition-colors ${
                          isSelected ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-ink-secondary hover:bg-surface-muted hover:text-ink-primary'
                        }`}
                        onClick={() => handleSelectWorkspace(ws)}
                        role="menuitem"
                        type="button"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Crown className="size-3.5 shrink-0 text-indigo-600" />
                          <div className="truncate">
                            <p className="font-medium text-ink-primary">{ws.name}</p>
                            <p className="text-[10px] text-indigo-600 font-medium">Manager</p>
                          </div>
                        </div>
                        {isSelected && <Check className="size-3.5 shrink-0 text-indigo-600" />}
                      </button>
                    )
                  })}
              </div>
            )}

            {/* Team Member Workspaces Section */}
            {workspaces.filter((w) => w.role !== 'manager' && w.role !== 'owner').length > 0 && (
              <div className="border-t border-line-default pt-1.5 pb-1">
                <p className="px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                  Team Member
                </p>
                {workspaces
                  .filter((w) => w.role !== 'manager' && w.role !== 'owner')
                  .map((ws) => {
                    const isSelected = activeWorkspace?.id === ws.id
                    return (
                      <button
                        key={ws.id}
                        className={`flex w-full items-center justify-between gap-2 rounded-control px-2.5 py-2 text-xs text-left transition-colors ${
                          isSelected ? 'bg-emerald-50 text-emerald-700 font-semibold' : 'text-ink-secondary hover:bg-surface-muted hover:text-ink-primary'
                        }`}
                        onClick={() => handleSelectWorkspace(ws)}
                        role="menuitem"
                        type="button"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Users className="size-3.5 shrink-0 text-emerald-600" />
                          <div className="truncate">
                            <p className="font-medium text-ink-primary">{ws.name}</p>
                            <p className="text-[10px] text-emerald-600 font-medium">Team Member</p>
                          </div>
                        </div>
                        {isSelected && <Check className="size-3.5 shrink-0 text-emerald-600" />}
                      </button>
                    )
                  })}
              </div>
            )}
          </div>

          {/* Hub Action Link */}
          <div className="border-t border-line-default pt-1 space-y-0.5">
            <button
              className="flex w-full items-center gap-2 rounded-control px-2.5 py-1.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 transition-colors"
              onClick={() => { setIsOpen(false); setIsCreateModalOpen(true) }}
              role="menuitem"
              type="button"
            >
              <Plus className="size-3.5" />
              <span>+ Create a Workspace</span>
            </button>
            <button
              className="flex w-full items-center gap-2 rounded-control px-2.5 py-1.5 text-xs font-semibold text-emerald-600 hover:bg-emerald-50 transition-colors"
              onClick={() => { setIsOpen(false); setIsJoinModalOpen(true) }}
              role="menuitem"
              type="button"
            >
              <Users className="size-3.5" />
              <span>Join with Invite Code</span>
            </button>
            <button
              className="flex w-full items-center gap-2 rounded-control px-2.5 py-1.5 text-xs font-medium text-ink-muted hover:bg-surface-muted hover:text-ink-primary transition-colors"
              onClick={handleGoToHub}
              role="menuitem"
              type="button"
            >
              <Building2 className="size-3.5" />
              <span>Workspace Hub (All & Invites)</span>
            </button>
          </div>
        </div>
      )}

      <CreateWorkspaceModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />

      <JoinWorkspaceModal
        isOpen={isJoinModalOpen}
        onClose={() => setIsJoinModalOpen(false)}
      />
    </div>
  )
}
