import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useWorkspace } from '@/context/WorkspaceContext'
import { getWorkspaceContext } from '@/services/api/workspaces'
import CRMDashboardPage from '@/pages/crm/CRMDashboardPage'
import { Loader2 } from '@/components/ui/icons'

export default function WorkspaceContextHandler() {
  const { workspaceId } = useParams()
  const { activeWorkspace, switchWorkspace, workspaces } = useWorkspace()
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!workspaceId) return

    // If activeWorkspace is already this workspace, nothing to do
    if (activeWorkspace?.id === workspaceId && activeWorkspace?.type !== 'personal') return

    // Try finding in local workspaces list first
    const found = workspaces.find((w) => w.id === workspaceId)
    if (found) {
      switchWorkspace(found)
      return
    }

    // Otherwise fetch context from backend
    setLoading(true)
    getWorkspaceContext(workspaceId)
      .then((ctx) => {
        if (ctx) {
          switchWorkspace({
            id: workspaceId,
            name: ctx.workspace_name,
            type: ctx.workspace_type || 'team',
            role: ctx.role,
            roleLabel: ctx.is_manager ? 'Manager' : 'Team Member',
            isOwner: ctx.is_manager,
            membersCount: 1,
          })
        }
      })
      .catch((err) => {
        console.error('Failed to load workspace context:', err)
      })
      .finally(() => {
        setLoading(false)
      })
  }, [workspaceId, activeWorkspace?.id, activeWorkspace?.type, workspaces, switchWorkspace])

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-8 animate-spin text-brand-600" />
          <p className="text-sm text-ink-muted">Loading workspace context…</p>
        </div>
      </div>
    )
  }

  return <CRMDashboardPage />
}
