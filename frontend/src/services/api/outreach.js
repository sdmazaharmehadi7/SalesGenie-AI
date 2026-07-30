import client from './client'
export const generateCampaign = (leadId) =>
  client.post(`/leads/${leadId}/campaigns/generate`);

export const getCampaigns = (leadId) =>
  client.get(`/leads/${leadId}/campaigns`);

export const updateCampaign = (leadId, campaignId, data) =>
  client.patch(`/leads/${leadId}/campaigns/${campaignId}`, data);

export const sendCampaign = (leadId, campaignId) =>
  client.post(`/leads/${leadId}/campaigns/${campaignId}/send`);