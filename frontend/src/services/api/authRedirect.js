import { listMyWorkspaces, listMyPendingInvitations } from '@/services/api/workspaces'

/**
 * Determine whether an authenticated user should go to /onboarding (new user)
 * or /workspace-hub (existing user with workspaces, memberships, or history).
 *
 * @param {Object} user - The authenticated user object from /auth/me
 * @returns {Promise<string>} '/onboarding' or '/workspace-hub'
 */
export async function getPostAuthRedirectUrl(user) {
  try {
    const [workspaces, invitations] = await Promise.all([
      listMyWorkspaces().catch(() => []),
      listMyPendingInvitations().catch(() => []),
    ])

    const hasWorkspaces = Array.isArray(workspaces) && workspaces.length > 0
    const hasInvitations = Array.isArray(invitations) && invitations.length > 0
    const hasOnboarded = user?.id
      ? localStorage.getItem(`sg_onboarded_${user.id}`) === 'true'
      : false

    if (hasWorkspaces || hasInvitations || hasOnboarded) {
      return '/workspace-hub'
    }
    return '/onboarding'
  } catch (err) {
    console.error('Failed to determine post-auth destination:', err)
    return '/onboarding'
  }
}
