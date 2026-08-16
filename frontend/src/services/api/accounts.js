import api from './client'

export const getAccounts = async (params = {}) => {
  const { page = 1, page_size = 50, search, owner_id } = params
  const query = { page, page_size }
  if (search) query.search = search
  if (owner_id) query.owner_id = owner_id
  const response = await api.get('/accounts', { params: query })
  return response.data
}

export const getAccount = async (id) => {
  const response = await api.get(`/accounts/${id}`)
  return response.data
}

export const createAccount = async (data) => {
  const response = await api.post('/accounts', data)
  return response.data
}

export const updateAccount = async (id, data) => {
  const response = await api.patch(`/accounts/${id}`, data)
  return response.data
}

export const deleteAccount = async (id) => {
  const response = await api.delete(`/accounts/${id}`)
  return response.data
}

export const getAccountContacts = async (id) => {
  const response = await api.get(`/accounts/${id}/contacts`)
  return response.data
}

export const getAccountOpportunities = async (id) => {
  const response = await api.get(`/accounts/${id}/opportunities`)
  return response.data
}

export const getAccountActivities = async (id) => {
  const response = await api.get(`/accounts/${id}/activities`)
  return response.data
}

export const generateAccountInsights = async (id) => {
  const response = await api.post(`/accounts/${id}/insights`)
  return response.data
}
