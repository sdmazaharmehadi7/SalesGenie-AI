import api from './client'

/**
 * Get paginated list of notifications for the authenticated user and active workspace.
 * @param {{ page?: number, page_size?: number, is_read?: boolean }} params
 */
export const getNotifications = async (params = {}) => {
  const response = await api.get('/notifications', { params })
  return response.data
}

/**
 * Get count of unread notifications for the bell badge.
 */
export const getUnreadCount = async () => {
  const response = await api.get('/notifications/unread-count')
  return response.data
}

/**
 * Mark a single notification as read.
 * @param {string} notificationId
 */
export const markNotificationAsRead = async (notificationId) => {
  const response = await api.patch(`/notifications/${notificationId}/read`)
  return response.data
}

/**
 * Mark all notifications as read for current user in active workspace.
 */
export const markAllNotificationsAsRead = async () => {
  const response = await api.post('/notifications/mark-all-read')
  return response.data
}

/**
 * Delete a single notification.
 * @param {string} notificationId
 */
export const deleteNotification = async (notificationId) => {
  const response = await api.delete(`/notifications/${notificationId}`)
  return response.data
}

/**
 * Delete all read notifications for current user in active workspace.
 */
export const clearAllReadNotifications = async () => {
  const response = await api.delete('/notifications/clear-read')
  return response.data
}


/**
 * Get user's notification preferences.
 */
export const getNotificationPreferences = async () => {
  const response = await api.get('/notifications/preferences')
  return response.data
}

/**
 * Update user's notification preferences.
 * @param {object} preferences
 */
export const updateNotificationPreferences = async (preferences) => {
  const response = await api.put('/notifications/preferences', preferences)
  return response.data
}

/**
 * Trigger weekly digest simulator for testing.
 */
export const triggerTestDigest = async () => {
  const response = await api.post('/notifications/triggers/test-digest')
  return response.data
}

/**
 * Trigger AI insight simulator for testing.
 */
export const triggerTestAiInsight = async (params = {}) => {
  const response = await api.post('/notifications/triggers/test-ai-insight', null, { params })
  return response.data
}
