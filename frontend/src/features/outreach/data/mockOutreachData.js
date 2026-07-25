// Mock data and template generator for AI Outreach Generator

export const TONE_OPTIONS = [
  { id: 'professional', label: 'Professional & Direct', desc: 'Concise, value-focused, and formal' },
  { id: 'consultative', label: 'Consultative & Friendly', desc: 'Insight-led, conversational tone' },
  { id: 'persuasive', label: 'Bold & Persuasive', desc: 'Focuses on strong ROI and social proof' },
  { id: 'urgent', label: 'Urgent & Time-Sensitive', desc: 'Highlights immediate opportunity & action' },
]

export const LENGTH_OPTIONS = [
  { id: 'short', label: 'Short (~75 words)', desc: 'Quick 30-second read, ideal for cold emails' },
  { id: 'medium', label: 'Medium (~150 words)', desc: 'Balanced detail with social proof & CTA' },
  { id: 'long', label: 'Detailed (~250 words)', desc: 'Comprehensive case study & problem breakdown' },
]

export const INDUSTRY_OPTIONS = [
  'Enterprise SaaS',
  'Fintech & Payments',
  'Healthcare & Biotech',
  'E-Commerce & Retail',
  'Cybersecurity & Cloud',
  'Financial Services',
  'Logistics & Supply Chain',
]

export const SAMPLE_PROSPECTS = [
  {
    prospectName: 'Sarah Jenkins',
    jobTitle: 'Chief Technology Officer',
    companyName: 'Acme Corp',
    industry: 'Enterprise SaaS',
    painPoint: 'Manual CRM lead enrichment and API synchronization delays cutting SDR velocity.',
    valueProp: 'SalesGenie AI automates lead scoring in real-time with zero-latency webhooks.',
  },
  {
    prospectName: 'Marcus Vance',
    jobTitle: 'VP of Sales',
    companyName: 'PayPulse Fintech',
    industry: 'Fintech & Payments',
    painPoint: 'SDR reps spend 40% of their day manually researching prospect backgrounds.',
    valueProp: 'Autonomous AI lead research and 1-click personalized email draft generation.',
  },
]

export function generateOutreachEmail(formData) {
  const {
    prospectName = 'Prospect',
    jobTitle = 'Leader',
    companyName = 'Company',
    industry = 'Tech',
    painPoint = 'manual lead workflow delays',
    valueProp = 'automated AI lead scoring',
    tone = 'consultative',
    length = 'medium',
  } = formData

  const firstName = prospectName.split(' ')[0] || prospectName

  // Generate subjects based on tone
  const subjects = [
    `Quick question regarding ${companyName}'s ${industry} lead velocity`,
    `Automating SDR research for ${firstName} @ ${companyName}`,
    `Solving ${painPoint.slice(0, 35)}...`,
  ]

  let body = ''

  if (length === 'short') {
    body = `Hi ${firstName},

Noticed ${companyName}'s recent growth in ${industry}. Usually when ${jobTitle}s scale their teams, ${painPoint} cuts rep output by ~35%.

We built SalesGenie AI to deliver ${valueProp}.

Would you be open to a brief 5-minute preview this Thursday?

Best regards,
[Your Name]
SalesGenie AI Team`
  } else if (length === 'long') {
    body = `Hi ${firstName},

I hope this email finds you well. I've been following ${companyName}'s momentum in the ${industry} space, particularly around your expanding team.

As ${jobTitle}, your top priority is likely maintaining high sales rep output. However, many sales leaders we consult with share that ${painPoint} significantly limits monthly quota attainment.

At SalesGenie AI, we specialize in solving this exact challenge. Our platform delivers:
1. ${valueProp}
2. Automated multi-touch email sequence generation
3. Real-time win probability predictions and CRM synchronization

In fact, a peer company in ${industry} recently automated their qualification process with SalesGenie AI and achieved a 3.2x faster response rate and 28% higher SQL conversion within 30 days.

Would you have 15 minutes next Tuesday for a tailored walkthrough?

Warm regards,
[Your Name]
Senior Sales Advisor | SalesGenie AI`
  } else {
    // Medium (default)
    body = `Hi ${firstName},

Noticed ${companyName} is expanding its footprint in ${industry}. Most ${jobTitle}s we speak with mention that ${painPoint} is one of their largest friction points.

SalesGenie AI was built to fix this by enabling ${valueProp}.

Clients using our AI outreach platform have seen:
• 3.2x faster response time to qualified inbound leads
• 28% increase in SQL conversion rate

Would you be open to a quick 10-minute discovery call this Thursday to see how this fits into ${companyName}'s workflow?

Best regards,
[Your Name]
SalesGenie AI`
  }

  return {
    id: `outreach-${Date.now()}`,
    subjects,
    selectedSubject: subjects[0],
    body,
    spamScore: 'Low (2%)',
    readabilityScore: 'Grade 8 (High)',
    estOpenRate: '64% - 72%',
    generatedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  }
}
