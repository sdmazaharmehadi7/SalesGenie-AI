import api from './client'

export const getCRMSummary = async (params = {}) => {
  const response = await api.get('/crm/summary', { params })
  return response.data
}

export const getCRMForecast = async (params = {}) => {
  const response = await api.get('/crm/forecast', { params })
  return response.data
}
