import api from "./client";

// Lead Intelligence & Company Analysis (Module 4 on the backend).
// Every insight is scoped to a lead, hence the nested /leads/{leadId}/insights path.

// Generate a brand-new AI company-insight snapshot for a lead.
export const generateCompanyInsight = async (leadId) => {
  const response = await api.post(`/leads/${leadId}/insights/generate`);
  return response.data;
};

// Get the most recently generated insight for a lead.
// Returns null (instead of throwing) when no insight has been generated yet,
// since a 404 here is an expected, normal state for a fresh lead.
export const getLatestCompanyInsight = async (leadId) => {
  try {
    const response = await api.get(`/leads/${leadId}/insights/latest`);
    return response.data;
  } catch (error) {
    if (error?.response?.status === 404) {
      return null;
    }
    throw error;
  }
};

// List every insight snapshot ever generated for a lead (most recent history).
export const listCompanyInsights = async (leadId) => {
  const response = await api.get(`/leads/${leadId}/insights`);
  return response.data;
};
