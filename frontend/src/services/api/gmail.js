import api from './client'

/**
 * Fetch Google OAuth 2.0 authorization URL
 */
export async function getGmailAuthUrl(redirectUri) {
  const params = redirectUri ? { redirect_uri: redirectUri } : {}
  const response = await api.get('/integrations/gmail/auth-url', { params })
  return response.data
}

/**
 * Exchange OAuth callback code and state for stored integration
 */
export async function handleGmailCallback(code, state, redirectUri) {
  const response = await api.post('/integrations/gmail/callback', {
    code,
    state,
    redirect_uri: redirectUri,
  })
  return response.data
}

/**
 * Get current user's Gmail connection status
 */
export async function getGmailStatus() {
  const response = await api.get('/integrations/gmail/status')
  return response.data
}

/**
 * Disconnect Gmail integration and revoke tokens
 */
export async function disconnectGmail() {
  const response = await api.post('/integrations/gmail/disconnect')
  return response.data
}

/**
 * Test connectivity with Google APIs
 */
export async function testGmailConnection() {
  const response = await api.post('/integrations/gmail/test')
  return response.data
}

/**
 * Send an email via the user's connected Gmail account
 */
export async function sendGmailEmail(payload) {
  const response = await api.post('/integrations/gmail/send', payload)
  return response.data
}

/**
 * Manually trigger email synchronization & reply detection
 */
export async function syncGmailEmails() {
  const response = await api.post('/integrations/gmail/sync')
  return response.data
}
