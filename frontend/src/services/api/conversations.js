import client from './client'

// Conversation Intelligence (Module 4) — backed by
// `app/api/v1/endpoints/conversations.py`, mounted under `/leads`.

export const listInteractions = (leadId) => client.get(`/leads/${leadId}/interactions`)

export const summarizeInteraction = (leadId, payload) =>
  client.post(`/leads/${leadId}/interactions/summarize`, payload)

export const logInteraction = (leadId, payload) => client.post(`/leads/${leadId}/interactions`, payload)

export const scheduleFollowUp = (leadId, payload) => client.post(`/leads/${leadId}/schedule`, payload)
