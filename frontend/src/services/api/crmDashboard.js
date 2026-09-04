import api from './client'

// CRM Dashboard — backed by `app/api/v1/endpoints/crm_dashboard.py`.
// workspace_id is automatically injected by the Axios interceptor when a team
// workspace is active. Pass explicit params to override.

export const getCRMSummary = async (params = {}) => {
  const response = await api.get('/crm/summary', { params })
  return response.data
}

export const getCRMForecast = async (params = {}) => {
  const response = await api.get('/crm/forecast', { params })
  return response.data
}

export const getCRMLeadRecommendations = async (params = {}) => {
  const response = await api.get('/crm/lead-recommendations', { params })
  return response.data
}

