/**
 * Email configuration and sending API service.
 *
 * GET  /email/config   – fetch current user's SMTP settings
 * PUT  /email/config   – save / update SMTP settings
 * POST /email/test     – send a real test email
 */
import client from './client'

/** Fetch the authenticated user's SMTP email configuration. */
export const getEmailConfig = () => client.get('/email/config')

/**
 * Save / update SMTP email configuration.
 *
 * @param {object} data
 * @param {string}        data.smtp_host       - e.g. "smtp.gmail.com"
 * @param {number}        data.smtp_port       - e.g. 587
 * @param {boolean}       data.smtp_use_tls    - true = STARTTLS
 * @param {string|null}   data.smtp_username   - Gmail address
 * @param {string|null}   data.smtp_password   - App Password (write-only; omit to keep existing)
 * @param {string|null}   data.smtp_from_email - display From address
 * @param {string}        data.smtp_from_name  - display From name
 */
export const saveEmailConfig = (data) => client.put('/email/config', data)

/**
 * Send a test email using the saved SMTP configuration.
 *
 * @param {object} [data]
 * @param {string} [data.to_address] - recipient; defaults to smtp_username if omitted
 */
export const sendTestEmail = (data = {}) => client.post('/email/test', data)
