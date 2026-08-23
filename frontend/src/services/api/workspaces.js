import api from './client'

// ─── Workspace Management ─────────────────────────────────────────────────────

/**
 * List all workspaces the current user actively belongs to.
 * @returns {Promise<Array>} list of WorkspaceListItem
 */
export const listMyWorkspaces = () =>
  api.get('/workspaces').then((r) => r.data)

/**
 * Create a new workspace. Creator becomes Manager automatically.
 * @param {{ name: string, slug?: string, description?: string }} data
 * @returns {Promise<Object>} WorkspaceRead
 */
export const createWorkspace = (data) =>
  api.post('/workspaces', data).then((r) => r.data)

/**
 * Get a specific workspace's details (requires membership).
 * @param {string} workspaceId
 */
export const getWorkspace = (workspaceId) =>
  api.get(`/workspaces/${workspaceId}`).then((r) => r.data)

/**
 * Verify the caller has access to a workspace and get their role.
 * Used when switching context in the frontend.
 * @param {string} workspaceId
 */
export const getWorkspaceContext = (workspaceId) =>
  api.get(`/workspaces/${workspaceId}/context`).then((r) => r.data)

/**
 * Get the caller's own membership in a workspace.
 * @param {string} workspaceId
 */
export const getMyMembership = (workspaceId) =>
  api.get(`/workspaces/${workspaceId}/me`).then((r) => r.data)

/**
 * Leave a workspace.
 * @param {string} workspaceId
 */
export const leaveWorkspace = (workspaceId) =>
  api.delete(`/workspaces/${workspaceId}/leave`).then((r) => r.data)

// ─── Invitation Management ────────────────────────────────────────────────────

/**
 * List pending invitations sent to the current user's email.
 * @returns {Promise<Array>} list of PendingInvitationItem
 */
export const listMyPendingInvitations = () =>
  api.get('/workspaces/invitations/pending').then((r) => r.data)

/**
 * Look up an invitation by token (without accepting it).
 * Use this to preview the workspace before accepting.
 * @param {string} token
 * @returns {Promise<Object>} PendingInvitationItem
 */
export const lookupInvitation = (token) =>
  api.get('/workspaces/invitations/lookup', { params: { token } }).then((r) => r.data)

/**
 * Accept a workspace invitation by token.
 * Creates an active TEAM_MEMBER membership.
 * @param {string} token
 * @returns {Promise<Object>} AcceptInvitationResponse
 */
export const acceptInvitation = (token) =>
  api.post('/workspaces/invitations/accept', { token }).then((r) => r.data)

/**
 * Reject/decline a workspace invitation by token.
 * @param {string} token
 */
export const rejectInvitation = (token) =>
  api.post('/workspaces/invitations/reject', { token })

// ─── Manager: Workspace Invitations ──────────────────────────────────────────

/**
 * Invite a user by email to a workspace (manager only).
 * @param {string} workspaceId
 * @param {{ email: string, role?: string }} payload
 */
export const inviteUserByEmail = (workspaceId, payload) =>
  api.post(`/workspaces/${workspaceId}/invitations`, payload).then((r) => r.data)

/**
 * List all pending invitations for a workspace (manager only).
 * @param {string} workspaceId
 */
export const listWorkspaceInvitations = (workspaceId) =>
  api.get(`/workspaces/${workspaceId}/invitations`).then((r) => r.data)

/**
 * Cancel a pending invitation (manager only).
 * @param {string} workspaceId
 * @param {string} invitationId
 */
export const cancelInvitation = (workspaceId, invitationId) =>
  api.delete(`/workspaces/${workspaceId}/invitations/${invitationId}`)

// ─── Manager: Member Management ──────────────────────────────────────────────

/**
 * List all members in a workspace.
 * @param {string} workspaceId
 */
export const listWorkspaceMembers = (workspaceId) =>
  api.get(`/workspaces/${workspaceId}/members`).then((r) => r.data)

/**
 * Update a member's role (manager only).
 * @param {string} workspaceId
 * @param {string} userId
 * @param {string} role - 'manager' | 'team_member'
 */
export const updateMemberRole = (workspaceId, userId, role) =>
  api.patch(`/workspaces/${workspaceId}/members/${userId}/role`, { role }).then((r) => r.data)

/**
 * Remove a member from the workspace (manager only).
 * @param {string} workspaceId
 * @param {string} userId
 */
export const removeWorkspaceMember = (workspaceId, userId) =>
  api.delete(`/workspaces/${workspaceId}/members/${userId}`)
