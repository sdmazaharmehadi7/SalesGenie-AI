import client from './client'

export async function getTeamSummary(range = 'month', workspaceId = null) {
  const params = { range }
  if (workspaceId) params.workspace_id = workspaceId
  const res = await client.get('/team-tracking/summary', { params })
  return res.data
}

export async function getTeamMembers(range = 'month', workspaceId = null) {
  const params = { range }
  if (workspaceId) params.workspace_id = workspaceId
  const res = await client.get('/team-tracking/members', { params })
  return res.data
}

export async function getMemberDetails(memberId, range = 'month', workspaceId = null) {
  const params = { range }
  if (workspaceId) params.workspace_id = workspaceId
  const res = await client.get(`/team-tracking/members/${memberId}`, { params })
  return res.data
}

export async function getTeamActivities(params = {}) {
  const res = await client.get('/team-tracking/activities', { params })
  return res.data
}

export async function getTeamFollowUps(workspaceId = null) {
  const params = {}
  if (workspaceId) params.workspace_id = workspaceId
  const res = await client.get('/team-tracking/follow-ups', { params })
  return res.data
}

export async function getTeamAiInsights(workspaceId = null) {
  const params = {}
  if (workspaceId) params.workspace_id = workspaceId
  const res = await client.get('/team-tracking/insights', { params })
  return res.data
}

export async function getTeamChartsData(range = 'month', workspaceId = null) {
  const params = { range }
  if (workspaceId) params.workspace_id = workspaceId
  const res = await client.get('/team-tracking/charts', { params })
  return res.data
}
