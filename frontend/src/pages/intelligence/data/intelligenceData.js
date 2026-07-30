// Filter option lists for the Lead Intelligence page.
// Statuses mirror the backend's `LeadStatus` enum
// (app/models/pipeline_enums.py) so the status filter always matches
// real data coming back from the API.

export const STATUSES = [
  'All Statuses',
  'New',
  'Qualified',
  'Proposal',
  'Negotiation',
  'Closed Won',
  'Closed Lost',
]

export const SCORE_RANGES = [
  'All Scores',
  'Hot Leads (80-100)',
  'Warm Leads (50-79)',
  'Cold Leads (0-49)',
  'Not Yet Scored',
]

export const DEFAULT_INDUSTRY_OPTION = 'All Industries'
