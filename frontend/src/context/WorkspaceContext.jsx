import { createContext, useCallback, useContext, useEffect, useState } from 'react'

const DEFAULT_PERSONAL_WORKSPACE = {
  id: 'personal',
  name: 'Personal Area',
  type: 'personal',
  role: 'owner',
  roleLabel: 'Solo Owner',
  description: 'Private CRM & AI Workspace',
}

const DEFAULT_INITIAL_WORKSPACES = [
  {
    id: 'ws-techscale',
    name: 'TechScale Sales',
    companyName: 'TechScale Inc',
    type: 'team',
    role: 'manager',
    roleLabel: 'Manager',
    membersCount: 8,
    description: 'Enterprise AI & Sales Operations Hub',
    isOwner: true,
  },
  {
    id: 'ws-abccompany',
    name: 'ABC Company',
    companyName: 'ABC Corp',
    type: 'team',
    role: 'member',
    roleLabel: 'Team Member',
    membersCount: 24,
    description: 'Regional B2B Pipeline & Account Management',
    isOwner: false,
  },
]

const WorkspaceContext = createContext(null)

export function WorkspaceProvider({ children }) {
  const [activeWorkspace, setActiveWorkspace] = useState(() => {
    try {
      const stored = localStorage.getItem('sg_active_workspace')
      return stored ? JSON.parse(stored) : DEFAULT_PERSONAL_WORKSPACE
    } catch {
      return DEFAULT_PERSONAL_WORKSPACE
    }
  })

  const [workspaces, setWorkspaces] = useState(() => {
    try {
      const stored = localStorage.getItem('sg_user_workspaces')
      return stored ? JSON.parse(stored) : DEFAULT_INITIAL_WORKSPACES
    } catch {
      return DEFAULT_INITIAL_WORKSPACES
    }
  })

  // Synchronize active workspace changes with localStorage
  const switchWorkspace = useCallback((ws) => {
    if (!ws) return
    setActiveWorkspace(ws)
    try {
      localStorage.setItem('sg_active_workspace', JSON.stringify(ws))
    } catch (e) {
      console.error('Failed to persist active workspace:', e)
    }
  }, [])

  const switchToPersonal = useCallback((userName) => {
    const personal = {
      ...DEFAULT_PERSONAL_WORKSPACE,
      name: userName ? `${userName}'s Personal Area` : 'Personal Area',
    }
    switchWorkspace(personal)
  }, [switchWorkspace])

  // Sync available workspaces list
  const refreshWorkspaces = useCallback(() => {
    try {
      const stored = localStorage.getItem('sg_user_workspaces')
      if (stored) setWorkspaces(JSON.parse(stored))
    } catch (e) {
      console.error('Failed to read user workspaces:', e)
    }
  }, [])

  const createWorkspace = useCallback(({ name, companyName, description }) => {
    const newWs = {
      id: `ws-${Date.now()}`,
      name: name.trim(),
      companyName: (companyName || name).trim(),
      description: (description || '').trim(),
      type: 'team',
      role: 'manager',
      roleLabel: 'Manager',
      isOwner: true,
      membersCount: 1,
      createdAt: new Date().toISOString(),
    }

    setWorkspaces((prev) => {
      const updated = [...prev.filter((w) => w.id !== newWs.id), newWs]
      try {
        localStorage.setItem('sg_user_workspaces', JSON.stringify(updated))
      } catch (e) {
        console.error('Failed to persist user workspaces:', e)
      }
      return updated
    })

    switchWorkspace(newWs)
    return newWs
  }, [switchWorkspace])

  const MOCK_INVITATIONS_REGISTRY = {
    'WS-ALPHA-8492': { name: 'Alpha Growth Labs', companyName: 'Alpha Labs', description: 'B2B Outbound & SDR Operations' },
    'INV-SALES-2026': { name: 'Apex Sales Network', companyName: 'Apex Inc', description: 'Enterprise Pipelines & Opportunity Tracking' },
    'XYZ-CORP': { name: 'XYZ Corp', companyName: 'XYZ Technologies', description: 'Global Sales & Partner Intelligence' },
    'DEMO-TEAM': { name: 'CloudScale Team', companyName: 'CloudScale', description: 'Predictive Sales Analytics & Lead Forecasting' },
  }

  const joinWorkspace = useCallback(({ inviteCode }) => {
    const raw = (inviteCode || '').trim()
    if (!raw) {
      return { success: false, error: 'Please enter a valid invitation code or token.' }
    }

    const cleanCode = raw.toUpperCase()
    const matched = MOCK_INVITATIONS_REGISTRY[cleanCode]
    const baseName = matched?.name || (cleanCode.startsWith('WS-') ? cleanCode.replace(/^WS-/, '') : cleanCode)

    const newWs = {
      id: `ws-${cleanCode.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
      name: matched?.name || `${baseName} Workspace`,
      companyName: matched?.companyName || baseName,
      description: matched?.description || 'Team workspace joined via invitation code',
      type: 'team',
      role: 'member',
      roleLabel: 'Team Member',
      isOwner: false,
      membersCount: 12,
      inviteCode: cleanCode,
      joinedAt: new Date().toISOString(),
    }

    setWorkspaces((prev) => {
      const updated = [...prev.filter((w) => w.id !== newWs.id), newWs]
      try {
        localStorage.setItem('sg_user_workspaces', JSON.stringify(updated))
      } catch (e) {
        console.error('Failed to persist user workspaces:', e)
      }
      return updated
    })

    switchWorkspace(newWs)
    return { success: true, workspace: newWs }
  }, [switchWorkspace])

  const isPersonal = activeWorkspace?.type === 'personal'
  const isManager = activeWorkspace?.role === 'manager' || activeWorkspace?.role === 'owner'
  const currentRole = activeWorkspace?.roleLabel || (isPersonal ? 'Solo Owner' : isManager ? 'Manager' : 'Team Member')

  const value = {
    activeWorkspace,
    workspaces,
    isPersonal,
    isManager,
    currentRole,
    switchWorkspace,
    switchToPersonal,
    createWorkspace,
    joinWorkspace,
    refreshWorkspaces,
  }

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext)
  if (!ctx) {
    throw new Error('useWorkspace must be used inside <WorkspaceProvider>')
  }
  return ctx
}
