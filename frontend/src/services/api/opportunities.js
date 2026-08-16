import api from './client'

export const getOpportunities = async (params = {}) => {
  const { page = 1, page_size = 50, account_id, contact_id, stage, search, owner_id } = params
  const query = { page, page_size }
  if (account_id) query.account_id = account_id
  if (contact_id) query.contact_id = contact_id
  if (stage) query.stage = stage
  if (search) query.search = search
  if (owner_id) query.owner_id = owner_id
  const response = await api.get('/opportunities', { params: query })
  return response.data
}

export const getPipelineBoard = async (params = {}) => {
  const response = await api.get('/opportunities/pipeline/board', { params })
  return response.data
}

export const getOpportunity = async (id) => {
  const response = await api.get(`/opportunities/${id}`)
  return response.data
}

export const createOpportunity = async (data) => {
  const response = await api.post('/opportunities', data)
  return response.data
}

export const updateOpportunity = async (id, data) => {
  const response = await api.patch(`/opportunities/${id}`, data)
  return response.data
}

export const updateOpportunityStage = async (id, stage) => {
  const response = await api.patch(`/opportunities/${id}/stage`, { stage })
  return response.data
}

export const deleteOpportunity = async (id) => {
  const response = await api.delete(`/opportunities/${id}`)
  return response.data
}

export const getOpportunityActivities = async (id) => {
  const response = await api.get(`/opportunities/${id}/activities`)
  return response.data
}

export const analyzeOpportunityDeal = async (id) => {
  const response = await api.post(`/opportunities/${id}/analyze`)
  return response.data
}
