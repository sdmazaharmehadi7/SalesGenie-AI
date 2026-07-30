import client from './client'

// Sales Analytics (Module 8) — backed by `app/api/v1/endpoints/dashboard.py`.

export const getDashboardSummary = () => client.get('/dashboard/summary')

export const getSnapshotHistory = (limit = 30) =>
  client.get('/dashboard/snapshots', { params: { limit } })

export const recordSnapshot = () => client.post('/dashboard/snapshot')
