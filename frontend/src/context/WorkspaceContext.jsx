import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { registerAuthCallbacks } from '@/context/AuthContext'
import {
  acceptInvitation,
  createWorkspace as apiCreateWorkspace,
  getWorkspaceContext,
  listMyWorkspaces,
  lookupInvitation,
} from '@/services/api/workspaces'

// ─── Personal Area constant ───────────────────────────────────────────────────
const PERSONAL_WORKSPACE = {
  id: 'personal',
  name: 'Personal Area',
  type: 'personal',
  role: 'owner',
  roleLabel: 'Solo Owner',
  description: 'Private CRM & AI Workspace',
}

function buildPersonalWorkspace(userName) {
  return {
    ...PERSONAL_WORKSPACE,
    name: userName ? `${userName}'s Personal Area` : 'Personal Area',
  }
}

/** Map a backend WorkspaceListItem to the shape the UI expects */
function normalizeWorkspace(ws) {
  const role = ws.my_role ?? ws.role ?? 'team_member' // backend returns snake_case
  const isManager = role === 'manager'
  return {
    id: ws.id,
    name: ws.name,
    description: ws.description || '',
    type: ws.type || 'team',
    role: role,
    roleLabel: isManager ? 'Manager' : 'Team Member',
    isOwner: isManager,
    membersCount: ws.member_count ?? ws.membersCount ?? 1,
  }
}

const WorkspaceContext = createContext(null)

export function WorkspaceProvider({ children }) {
  // Active workspace — start from localStorage so the UI doesn't flicker on reload
  const [activeWorkspace, setActiveWorkspaceState] = useState(() => {
    try {
      const stored = localStorage.getItem('sg_active_workspace')
      return stored ? JSON.parse(stored) : PERSONAL_WORKSPACE
    } catch {
      return PERSONAL_WORKSPACE
    }
  })

  // Available team workspaces (excludes Personal Area — that's always implicit)
  const [workspaces, setWorkspaces] = useState([])
  const [isLoadingWorkspaces, setIsLoadingWorkspaces] = useState(false)
  const [workspacesError, setWorkspacesError] = useState(null)

  // Prevent duplicate fetches
  const fetchInProgress = useRef(false)

  // ─── Persist active workspace to localStorage ─────────────────────────────
  function persistActiveWorkspace(ws) {
    try {
      localStorage.setItem('sg_active_workspace', JSON.stringify(ws))
    } catch {
      // Storage quota exceeded — non-critical, just don't persist
    }
  }

  // ─── Fetch workspaces from backend ────────────────────────────────────────
  const refreshWorkspaces = useCallback(async () => {
    const token = localStorage.getItem('access_token')
    if (!token) return

    if (fetchInProgress.current) return
    fetchInProgress.current = true
    setIsLoadingWorkspaces(true)
    setWorkspacesError(null)

    try {
      const data = await listMyWorkspaces()
      const normalized = (data || []).map(normalizeWorkspace)
      setWorkspaces(normalized)

      // If activeWorkspace is a team workspace, verify it still exists in the list.
      // If not (e.g. removed from workspace), fall back to Personal Area.
      setActiveWorkspaceState((prev) => {
        if (prev?.type === 'personal') return prev
        const stillExists = normalized.find((w) => w.id === prev?.id)
        if (!stillExists) {
          const personal = PERSONAL_WORKSPACE
          persistActiveWorkspace(personal)
          return personal
        }
        // Refresh role/name in case they changed on the backend
        const refreshed = { ...prev, ...stillExists }
        persistActiveWorkspace(refreshed)
        return refreshed
      })
    } catch (err) {
      console.error('[WorkspaceContext] Failed to fetch workspaces:', err)
      setWorkspacesError('Unable to load workspaces.')
    } finally {
      setIsLoadingWorkspaces(false)
      fetchInProgress.current = false
    }
  }, [])

  // Load workspaces on mount if authenticated
  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (token) {
      refreshWorkspaces()
    }

    // Register workspace callbacks with AuthContext so we can react to login/logout
    // without a circular context dependency (WorkspaceContext → AuthContext).
    registerAuthCallbacks({
      onLoginSuccess: () => refreshWorkspaces(),
      onLogout: () => {
        setWorkspaces([])
        const personal = PERSONAL_WORKSPACE
        persistActiveWorkspace(personal)
        setActiveWorkspaceState(personal)
      },
    })
  }, [refreshWorkspaces])

  // ─── Switch active workspace ──────────────────────────────────────────────
  const switchWorkspace = useCallback((ws) => {
    if (!ws) return
    persistActiveWorkspace(ws)
    setActiveWorkspaceState(ws)
  }, [])

  const switchToPersonal = useCallback((userName) => {
    const personal = buildPersonalWorkspace(userName)
    switchWorkspace(personal)
  }, [switchWorkspace])

  // ─── Create workspace (calls backend) ────────────────────────────────────
  const createWorkspace = useCallback(async ({ name, description }) => {
    const slug = name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 60)

    const created = await apiCreateWorkspace({
      name: name.trim(),
      slug: `${slug}-${Date.now()}`,
      description: (description || '').trim(),
    })

    const normalized = normalizeWorkspace(created)
    setWorkspaces((prev) => {
      const withoutDupe = prev.filter((w) => w.id !== normalized.id)
      return [...withoutDupe, normalized]
    })
    switchWorkspace(normalized)
    return normalized
  }, [switchWorkspace])

  // ─── Join workspace via invitation token ──────────────────────────────────
  const joinWorkspace = useCallback(async ({ inviteCode }) => {
    const token = (inviteCode || '').trim()
    if (!token) {
      return { success: false, error: 'Please enter a valid invitation token.' }
    }

    // Step 1: Look up token to validate it exists and return workspace preview
    let preview
    try {
      preview = await lookupInvitation(token)
    } catch (err) {
      const msg =
        err?.response?.data?.detail ||
        'Invalid or expired invitation token. Please check and try again.'
      return { success: false, error: msg }
    }

    // Step 2: Accept the invitation on the backend
    let result
    try {
      result = await acceptInvitation(token)
    } catch (err) {
      const msg =
        err?.response?.data?.detail ||
        'Failed to accept the invitation. It may have already been accepted or expired.'
      return { success: false, error: msg }
    }

    // Step 3: Build local workspace entry from accept response
    const newWs = {
      id: result.workspace_id,
      name: result.workspace_name,
      description: preview?.workspace_description || '',
      type: result.workspace_type || 'team',
      role: result.role || 'team_member',
      roleLabel: result.is_manager ? 'Manager' : 'Team Member',
      isOwner: result.is_manager,
      membersCount: preview?.members_count ?? 1,
    }

    setWorkspaces((prev) => {
      const withoutDupe = prev.filter((w) => w.id !== newWs.id)
      return [...withoutDupe, newWs]
    })
    switchWorkspace(newWs)
    return { success: true, workspace: newWs }
  }, [switchWorkspace])

  // ─── Verify context on mount ──────────────────────────────────────────────
  // If the stored active workspace is a team workspace, verify access is still valid.
  useEffect(() => {
    const stored = activeWorkspace
    if (!stored || stored.type === 'personal') return
    const token = localStorage.getItem('access_token')
    if (!token) return

    getWorkspaceContext(stored.id).then((ctx) => {
      if (!ctx) return
      // Update role in case it changed
      setActiveWorkspaceState((prev) => {
        if (prev?.id !== stored.id) return prev
        const updated = {
          ...prev,
          role: ctx.role,
          roleLabel: ctx.is_manager ? 'Manager' : 'Team Member',
          isOwner: ctx.is_manager,
          name: ctx.workspace_name ?? prev.name,
        }
        persistActiveWorkspace(updated)
        return updated
      })
    }).catch(() => {
      // Access no longer valid (removed from workspace, etc.) — fall back to Personal
      const personal = PERSONAL_WORKSPACE
      persistActiveWorkspace(personal)
      setActiveWorkspaceState(personal)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // only on mount

  // ─── Derived state ────────────────────────────────────────────────────────
  const isPersonal = activeWorkspace?.type === 'personal'
  const isManager =
    activeWorkspace?.role === 'manager' || activeWorkspace?.role === 'owner'
  const currentRole =
    activeWorkspace?.roleLabel ||
    (isPersonal ? 'Solo Owner' : isManager ? 'Manager' : 'Team Member')

  const value = {
    // State
    activeWorkspace,
    workspaces,
    isPersonal,
    isManager,
    currentRole,
    isLoadingWorkspaces,
    workspacesError,
    // Actions
    switchWorkspace,
    switchToPersonal,
    createWorkspace,   // now async
    joinWorkspace,     // now async
    refreshWorkspaces,
  }

  return (
    <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>
  )
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext)
  if (!ctx) {
    throw new Error('useWorkspace must be used inside <WorkspaceProvider>')
  }
  return ctx
}
