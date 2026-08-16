import api from './client'

export const getActivities = async (params = {}) => {
  const response = await api.get('/activities', { params })
  return response.data
}

export const logActivity = async (data) => {
  const response = await api.post('/activities', data)
  return response.data
}
