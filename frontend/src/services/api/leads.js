import api from './client'

/**
 * Get a paginated list of leads.
 * @param {{ page?, page_size?, status?, search? }} params
 */
export const getLeads = async (params = {}) => {
  const { page = 1, page_size = 100, status, search } = params
  const query = { page, page_size }
  if (status) query.status_filter = status
  if (search) query.search = search
  const response = await api.get('/leads', { params: query })
  return response.data
}

/** Create a new lead. */
export const createLead = async (leadData) => {
  const response = await api.post('/leads', leadData)
  return response.data
}

/** Get a single lead by ID. */
export const getLead = async (leadId) => {
  const response = await api.get(`/leads/${leadId}`)
  return response.data
}

/** Update a lead (PATCH). */
export const updateLead = async (leadId, leadData) => {
  const response = await api.patch(`/leads/${leadId}`, leadData)
  return response.data
}

/** Permanently delete a lead. */
export const deleteLead = async (leadId) => {
  const response = await api.delete(`/leads/${leadId}`)
  return response.data
}