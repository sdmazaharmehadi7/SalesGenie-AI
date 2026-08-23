import client from './client'

// Sales Analytics (Module 8) — backed by `app/api/v1/endpoints/dashboard.py`.
// workspace_id is automatically injected by the Axios interceptor when a team
// workspace is active. Pass explicit params to override.

export const getDashboardSummary = (params = {}) =>
  client.get('/dashboard/summary', { params })

export const getSnapshotHistory = (limit = 30) =>
  client.get('/dashboard/snapshots', { params: { limit } })

export const recordSnapshot = () => client.post('/dashboard/snapshot')
