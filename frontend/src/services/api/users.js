import api from './client'

/** Get the currently authenticated user. */
export const getCurrentUser = () => api.get('/auth/me')

/** Update a user by ID — admin only in the backend. */
export const updateUser = (userId, data) => api.patch(`/users/${userId}`, data)

/** List all users — admin only. */
export const listUsers = (params) => api.get('/users', { params })
