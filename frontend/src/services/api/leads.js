import api from "./client";

export const getLeads = async () => {
  const response = await api.get("/leads?page=1&page_size=20");
  return response.data;
};

export const createLead = async (leadData) => {
  const response = await api.post("/leads", leadData);
  return response.data;
};

// Update Lead
export const updateLead = async (leadId, leadData) => {
  const response = await api.patch(`/leads/${leadId}`, leadData);
  return response.data;
};

// Delete Lead
export const deleteLead = async (leadId) => {
  const response = await api.delete(`/leads/${leadId}`);
  return response.data;
};