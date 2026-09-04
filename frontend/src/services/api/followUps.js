import api from './client'

export const getFollowUps = async (params = {}) => {
  const { page = 1, page_size = 50, status, lead_id, opportunity_id, assigned_to } = params
  const query = { page, page_size }
  if (status) query.status = status
  if (lead_id) query.lead_id = lead_id
  if (opportunity_id) query.opportunity_id = opportunity_id
  if (assigned_to) query.assigned_to = assigned_to
  const response = await api.get('/follow-ups', { params: query })
  return response.data
}

export const getFollowUp = async (id) => {
  const response = await api.get(`/follow-ups/${id}`)
  return response.data
}

export const createFollowUp = async (data) => {
  const response = await api.post('/follow-ups', data)
  return response.data
}

export const updateFollowUp = async (id, data) => {
  const response = await api.patch(`/follow-ups/${id}`, data)
  return response.data
}

export const rescheduleFollowUp = async (id, data) => {
  const response = await api.patch(`/follow-ups/${id}/reschedule`, data)
  return response.data
}

export const completeFollowUp = async (id) => {
  const response = await api.patch(`/follow-ups/${id}/complete`)
  return response.data
}

export const deleteFollowUp = async (id) => {
  const response = await api.delete(`/follow-ups/${id}`)
  return response.data
}

export const getFollowUpsSummary = async () => {
  const response = await api.get('/follow-ups/summary')
  return response.data
}
