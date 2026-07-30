import api from './client'

/**
 * All SalesGenie AI-powered endpoints.
 * Backend: /api/v1/chat, /api/v1/email, /api/v1/summarize,
 *          /api/v1/followup, /api/v1/lead-score, /api/v1/objection
 */

/** General sales assistant chat. */
export const sendChatMessage = (message) =>
  api.post('/chat', { message })

/**
 * Generate a B2B sales email.
 * @param {{ lead_info, email_type, prospect_name, company_name, pain_points }} payload
 */
export const generateAIEmail = (payload) =>
  api.post('/email', payload)

/**
 * Summarize a sales conversation / transcript.
 * @param {{ content, source_type }} payload
 */
export const summarizeConversation = (payload) =>
  api.post('/summarize', payload)

/**
 * Generate a follow-up strategy.
 * @param {{ context, deal_stage, last_interaction }} payload
 */
export const generateFollowup = (payload) =>
  api.post('/followup', payload)

/**
 * AI lead qualification and scoring.
 * @param {{ lead_info, company_size, industry, budget_signals }} payload
 */
export const scoreLeadAI = (payload) =>
  api.post('/lead-score', payload)

/**
 * Generate an objection handling strategy.
 * @param {{ objection, category, competitor_name }} payload
 */
export const handleObjection = (payload) =>
  api.post('/objection', payload)
