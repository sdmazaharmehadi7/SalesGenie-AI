import api from './client'

export const getContacts = async (params = {}) => {
  const { page = 1, page_size = 50, account_id, lead_id, search, owner_id } = params
  const query = { page, page_size }
  if (account_id) query.account_id = account_id
  if (lead_id) query.lead_id = lead_id
  if (search) query.search = search
  if (owner_id) query.owner_id = owner_id
  const response = await api.get('/contacts', { params: query })
  return response.data
}

export const getContact = async (id) => {
  const response = await api.get(`/contacts/${id}`)
  return response.data
}

export const createContact = async (data) => {
  const response = await api.post('/contacts', data)
  return response.data
}

export const updateContact = async (id, data) => {
  const response = await api.patch(`/contacts/${id}`, data)
  return response.data
}

export const deleteContact = async (id) => {
  const response = await api.delete(`/contacts/${id}`)
  return response.data
}

export const getContactActivities = async (id) => {
  const response = await api.get(`/contacts/${id}/activities`)
  return response.data
}
