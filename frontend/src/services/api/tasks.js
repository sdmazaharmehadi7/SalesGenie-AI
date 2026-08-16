import api from './client'

export const getTasks = async (params = {}) => {
  const { page = 1, page_size = 50, is_completed, priority, lead_id, contact_id, account_id, opportunity_id, search, assigned_to } = params
  const query = { page, page_size }
  if (is_completed !== undefined) query.is_completed = is_completed
  if (priority) query.priority = priority
  if (lead_id) query.lead_id = lead_id
  if (contact_id) query.contact_id = contact_id
  if (account_id) query.account_id = account_id
  if (opportunity_id) query.opportunity_id = opportunity_id
  if (search) query.search = search
  if (assigned_to) query.assigned_to = assigned_to
  const response = await api.get('/tasks', { params: query })
  return response.data
}

export const getTask = async (id) => {
  const response = await api.get(`/tasks/${id}`)
  return response.data
}

export const createTask = async (data) => {
  const response = await api.post('/tasks', data)
  return response.data
}

export const updateTask = async (id, data) => {
  const response = await api.patch(`/tasks/${id}`, data)
  return response.data
}

export const toggleTaskComplete = async (id) => {
  const response = await api.patch(`/tasks/${id}/complete`)
  return response.data
}

export const deleteTask = async (id) => {
  const response = await api.delete(`/tasks/${id}`)
  return response.data
}
