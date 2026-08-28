import { useEffect } from 'react'
import { useWorkspace } from '@/context/WorkspaceContext'
import { useAuth } from '@/context/AuthContext'
import CRMDashboardPage from '@/pages/crm/CRMDashboardPage'

export default function PersonalContextHandler() {
  const { isPersonal, switchToPersonal } = useWorkspace()
  const { user } = useAuth()

  useEffect(() => {
    if (!isPersonal) {
      switchToPersonal(user?.name || user?.email?.split('@')[0])
    }
  }, [isPersonal, switchToPersonal, user])

  return <CRMDashboardPage />
}
