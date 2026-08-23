import { useWorkspace } from '@/context/WorkspaceContext'

/**
 * Returns a stable key that changes whenever the active workspace changes.
 * Use this as a dependency in `useEffect` / `useCallback` to trigger
 * data re-fetches when the user switches workspace context.
 *
 * Also returns `activeWorkspace`, `isPersonal`, `isManager` for convenience.
 *
 * Usage:
 *   const { workspaceKey, isPersonal, isManager } = useWorkspaceKey()
 *   useEffect(() => { loadData() }, [workspaceKey])
 */
export function useWorkspaceKey() {
  const { activeWorkspace, isPersonal, isManager, currentRole } = useWorkspace()

  // Use the workspace ID as the key. For Personal Area, use 'personal'.
  const workspaceKey = activeWorkspace?.id || 'personal'

  return {
    workspaceKey,
    activeWorkspace,
    isPersonal,
    isManager,
    currentRole,
  }
}
