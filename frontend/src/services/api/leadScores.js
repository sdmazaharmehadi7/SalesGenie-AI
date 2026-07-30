import api from "./client";

// Lead Scoring & Recommendation Engine (Module 6 on the backend), surfaced
// alongside Lead Intelligence in the frontend's "Lead Intelligence" page.

// Generate a brand-new AI lead-score snapshot.
export const generateLeadScore = async (leadId) => {
  const response = await api.post(`/leads/${leadId}/scores/generate`);
  return response.data;
};

// Get the most recent lead score for a lead.
// Returns null (instead of throwing) when no score has been generated yet.
export const getLatestLeadScore = async (leadId) => {
  try {
    const response = await api.get(`/leads/${leadId}/scores/latest`);
    return response.data;
  } catch (error) {
    if (error?.response?.status === 404) {
      return null;
    }
    throw error;
  }
};

// List every scoring snapshot ever generated for a lead.
export const listLeadScores = async (leadId) => {
  const response = await api.get(`/leads/${leadId}/scores`);
  return response.data;
};
