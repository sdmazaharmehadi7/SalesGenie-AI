export const COMPANIES = [
  'All Companies',
  'Northstar Labs',
  'Orbit Systems',
  'Pine & Co.',
  'Vertex Solutions',
  'BlueSky Analytics',
  'Apex Corp',
]

export const SENTIMENTS = {
  Positive: {
    label: 'Positive',
    color: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    dot: 'bg-emerald-500',
  },
  Neutral: {
    label: 'Neutral',
    color: 'bg-slate-100 text-slate-600 ring-slate-200',
    dot: 'bg-slate-400',
  },
  Negative: {
    label: 'Negative',
    color: 'bg-red-50 text-red-700 ring-red-100',
    dot: 'bg-red-500',
  },
  Mixed: {
    label: 'Mixed',
    color: 'bg-amber-50 text-amber-700 ring-amber-100',
    dot: 'bg-amber-500',
  },
}

export const summaries = [
  {
    id: 'sum-001',
    company: 'Northstar Labs',
    contact: 'Priya Sharma',
    contactRole: 'VP of Engineering',
    contactAvatar: 'PS',
    meetingDate: '2026-07-22',
    meetingType: 'Discovery Call',
    duration: '45 min',
    sentiment: 'Positive',
    aiSummary:
      'Priya expressed strong interest in our enterprise analytics suite. The team at Northstar Labs is currently struggling with data silos across three departments and sees our platform as a potential solution. Budget discussions were preliminary but encouraging — a formal evaluation is expected within Q3.',
    keyDecisions: [
      'Schedule a technical deep-dive with the engineering team',
      'Provide a sandbox environment for a 2-week POC',
      'Enterprise pricing proposal to be sent by Friday',
    ],
    nextActions: [
      'Send enterprise pricing deck by July 25',
      'Coordinate POC environment setup with Solutions team',
      'Calendar invite for technical deep-dive on August 5',
    ],
    tags: ['Enterprise', 'High Priority', 'Q3 Pipeline'],
  },
  {
    id: 'sum-002',
    company: 'Orbit Systems',
    contact: 'Marcus Webb',
    contactRole: 'Chief Operations Officer',
    contactAvatar: 'MW',
    meetingDate: '2026-07-20',
    meetingType: 'Demo',
    duration: '60 min',
    sentiment: 'Mixed',
    aiSummary:
      'Marcus was impressed by the automation capabilities but raised concerns about integration complexity with their legacy ERP system. The demo went well for the core CRM features. Technical team needs to review API documentation before committing. Internal champion identified: Sara Lin from IT.',
    keyDecisions: [
      'IT team will review API compatibility by July 30',
      'Defer contract discussion until technical review complete',
      'Sara Lin designated as internal champion',
    ],
    nextActions: [
      'Share detailed API documentation with Sara Lin',
      'Follow up with Marcus on July 31 post-review',
      'Prepare custom integration roadmap if needed',
    ],
    tags: ['Mid-Market', 'Technical Review', 'Integration'],
  },
  {
    id: 'sum-003',
    company: 'Pine & Co.',
    contact: 'Elena Torres',
    contactRole: 'Director of Sales',
    contactAvatar: 'ET',
    meetingDate: '2026-07-18',
    meetingType: 'Follow-up',
    duration: '30 min',
    sentiment: 'Positive',
    aiSummary:
      'Elena confirmed executive buy-in from their CEO. Pine & Co. are ready to move forward with a 50-seat starter plan. She mentioned their fiscal year ends August 31 and a signed contract before then is strongly preferred. Competitive situation: they evaluated Salesforce but found it too complex.',
    keyDecisions: [
      'Move to contract phase immediately',
      '50-seat starter plan confirmed as starting point',
      'Target signature by August 20 to align with fiscal year',
    ],
    nextActions: [
      'Send contract draft by July 22',
      'Schedule legal review call for July 26',
      'Prepare onboarding timeline for post-signature',
    ],
    tags: ['SMB', 'Closing', 'Hot Lead'],
  },
  {
    id: 'sum-004',
    company: 'Vertex Solutions',
    contact: 'David Park',
    contactRole: 'Head of Product',
    contactAvatar: 'DP',
    meetingDate: '2026-07-15',
    meetingType: 'Discovery Call',
    duration: '50 min',
    sentiment: 'Neutral',
    aiSummary:
      "David is evaluating multiple vendors including HubSpot and Zoho. Vertex Solutions is a fast-growing startup with 120 employees. He was interested in our AI-powered lead scoring but had budget constraints for the full platform. The conversation remained exploratory — no concrete commitment, but David agreed to a second call.",
    keyDecisions: [
      'Second discovery call scheduled for August 1',
      'Explore modular pricing to fit their budget',
      'Focus pitch on AI lead scoring differentiator',
    ],
    nextActions: [
      'Research Vertex Solutions competitors and tailor pitch',
      'Prepare modular pricing options',
      'Send AI lead scoring one-pager before August 1 call',
    ],
    tags: ['Startup', 'Competitive', 'Nurturing'],
  },
  {
    id: 'sum-005',
    company: 'BlueSky Analytics',
    contact: 'Aisha Johnson',
    contactRole: 'CEO',
    contactAvatar: 'AJ',
    meetingDate: '2026-07-12',
    meetingType: 'Executive Briefing',
    duration: '90 min',
    sentiment: 'Positive',
    aiSummary:
      'Executive-level alignment meeting. Aisha had reviewed our ROI case studies and arrived with specific questions about data governance and compliance (SOC 2, GDPR). Very strategic conversation - she wants to position SalesGenie as a core part of BlueSky\u2019s 2027 growth strategy. Deal size potentially $240k ARR.',
    keyDecisions: [
      'Full security and compliance documentation to be shared',
      'Custom SLA terms to be negotiated',
      'Potential 3-year enterprise agreement discussed',
    ],
    nextActions: [
      'Send SOC 2 and GDPR compliance reports',
      'Involve legal for custom SLA discussion by July 25',
      'Schedule quarterly business review cadence post-close',
    ],
    tags: ['Enterprise', 'Strategic', '$240k ARR', 'Compliance'],
  },
  {
    id: 'sum-006',
    company: 'Apex Corp',
    contact: 'Ryan Mitchell',
    contactRole: 'Sales Manager',
    contactAvatar: 'RM',
    meetingDate: '2026-07-10',
    meetingType: 'Objection Handling',
    duration: '35 min',
    sentiment: 'Negative',
    aiSummary:
      'Ryan expressed frustration with the onboarding timeline from a previous vendor (not us) and is cautious about committing to a new platform. He raised concerns about our customer support response times and mobile app functionality. The call ended without clear next steps. Needs significant nurturing.',
    keyDecisions: [
      'No immediate purchase decision — in evaluation pause',
      'Support SLA documentation to be sent',
      'Mobile roadmap to be shared',
    ],
    nextActions: [
      'Send customer support SLA and case study on fast onboarding',
      'Share mobile app roadmap (Q4 features)',
      'Check in again after 3 weeks — August 1',
    ],
    tags: ['At Risk', 'Objection', 'Nurturing'],
  },
]
