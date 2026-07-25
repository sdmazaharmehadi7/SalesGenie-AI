// Mock conversations and AI response generator for SalesGenie AI Assistant

export const MOCK_CONVERSATIONS = [
  {
    id: 'conv-1',
    title: 'Acme Corp Deal & Lead Intelligence',
    updatedAt: '10 mins ago',
    isPinned: true,
    messages: [
      {
        id: 'm-1-1',
        role: 'user',
        content: 'Analyze Acme Corp lead profile and provide a quick summary of deal potential and key contacts.',
        timestamp: '10:14 AM',
      },
      {
        id: 'm-1-2',
        role: 'assistant',
        content: `### Acme Corp — Deal & Lead Intelligence

**Company Profile**
* **Industry:** Enterprise Cloud Infrastructure & SaaS
* **Employee Count:** 1,200+
* **SalesGenie Lead Score:** **92 / 100** (High Priority Intent 🔥)

---

### Key Decision Makers
1. **Sarah Jenkins** — Chief Technology Officer (\`sarah.j@acmecorp.io\`)
2. **Marcus Vance** — VP of Enterprise Procurement (\`m.vance@acmecorp.io\`)

---

### Deal Potential Analysis
Acme Corp recently raised a **$45M Series C round** and expanded their engineering team by 40%. Their core pain point is manual CRM enrichment delays cutting sales capacity.

\`\`\`json
{
  "lead_id": "LD-8942",
  "company": "Acme Corp",
  "intent_score": 0.94,
  "recommended_action": "Schedule 30-min Technical Demo"
}
\`\`\``,
        timestamp: '10:15 AM',
      },
    ],
  },
  {
    id: 'conv-2',
    title: 'Fintech VP Cold Email Sequence',
    updatedAt: '2 hours ago',
    isPinned: true,
    messages: [
      {
        id: 'm-2-1',
        role: 'user',
        content: 'Draft a 3-step cold outreach sequence tailored for Fintech VP of Sales.',
        timestamp: '08:30 AM',
      },
      {
        id: 'm-2-2',
        role: 'assistant',
        content: `Here is your high-converting 3-step outreach sequence:

### Email 1: Value-First Opener
**Subject:** Quick question regarding {{company_name}}'s lead velocity

> Hi {{first_name}},
>
> Noticed {{company_name}} expanded your AE team recently. Usually when fintech sales teams scale, manual lead scoring cuts SDR dial capacity by ~35%.
>
> We built **SalesGenie AI** to automate lead enrichment in real-time.
>
> Open to a 5-minute preview of how we helped PayPulse boost demo bookings by 42%?
>
> Best regards,  
> {{your_name}}

---

### Email 2: Social Proof & Metrics (Day 3)
**Subject:** Re: {{company_name}} lead velocity

> Hi {{first_name}},
>
> Following up on my previous note. One of our fintech clients automated their lead assignment and saw:
> * **3.2x** faster response time to inbound leads
> * **28%** higher win-rate on SQLs
>
> Worth a brief 10-minute call this Thursday?`,
        timestamp: '08:32 AM',
      },
    ],
  },
  {
    id: 'conv-3',
    title: 'Q3 Pipeline Revenue Forecast',
    updatedAt: '1 day ago',
    isPinned: false,
    messages: [
      {
        id: 'm-3-1',
        role: 'user',
        content: 'What is our expected closing revenue for Q3 based on high probability deals (>75%)?',
        timestamp: 'Yesterday',
      },
      {
        id: 'm-3-2',
        role: 'assistant',
        content: `Based on current pipeline metrics, here is the forecast for high-probability Q3 deals:

* **High-Probability Qualified Opportunities:** 14
* **Win Probability Cutoff:** > 75%
* **Projected Revenue:** **$348,500**

\`\`\`sql
SELECT 
    company_name, 
    deal_value, 
    win_probability
FROM deals
WHERE win_probability >= 0.75 
  AND expected_close_date BETWEEN '2026-07-01' AND '2026-09-30'
ORDER BY deal_value DESC;
\`\`\``,
        timestamp: 'Yesterday',
      },
    ],
  },
]

export function generateAiResponse(promptText) {
  const lower = promptText.toLowerCase()

  if (lower.includes('lead') || lower.includes('score') || lower.includes('prospect')) {
    return `### SalesGenie AI Lead Analysis

Here is the intelligence summary for your query:

* **Account Fit Score:** **94 / 100**
* **Buying Signals:** 4 executive profile visits, 2 whitepaper downloads in the last 48 hours.

---

### Recommended Action
1. Dispatch personalized email referencing recent expansion.
2. Direct AE outreach to VP of Technology.

\`\`\`python
# Lead Automation Trigger
def process_high_intent_lead(lead):
    if lead.score >= 90:
        send_outreach_sequence(lead.email, template="enterprise_vip")
        assign_owner(lead.id, "senior_ae")
\`\`\``
  }

  if (lower.includes('email') || lower.includes('draft') || lower.includes('outreach') || lower.includes('sequence')) {
    return `Here is a custom email sequence drafted by SalesGenie AI:

**Subject:** Automated prospect intelligence for {{company_name}}

> Hi {{first_name}},
>
> I noticed {{company_name}} is scaling its sales team. Most sales leaders cite manual prospect research as their single largest time sink.
>
> **SalesGenie AI** automates lead enrichment and drafts targeted follow-ups in seconds.
>
> Are you open to a brief 10-minute preview this week?
>
> Best,  
> {{your_name}}`
  }

  if (lower.includes('meeting') || lower.includes('summary') || lower.includes('call')) {
    return `### Discovery Call Summary & Action Items

**Meeting:** Discovery Call — Acme Corp  
**Duration:** 32 mins | **Sentiment:** Positive (88%)

---

### Key Takeaways
* Prospect is replacing legacy manual CRM workflow.
* SOC2 Type II compliance is a mandatory requirement.
* Budget ($50k - $75k) is pre-approved for Q3 deployment.

---

### Action Items
- [x] Send SOC2 compliance package
- [ ] Deliver custom demo environment by Friday
- [ ] Schedule pricing review with CTO`
  }

  return `### SalesGenie AI Assistance

Thank you for your prompt: "${promptText}"

I am ready to help you with:
1. **Lead Intelligence & Scoring**: Prospect profiling and intent signals.
2. **Outreach Email Generation**: Multi-touch persona sequences.
3. **Meeting Intelligence**: Automated call summaries and action item extraction.
4. **Pipeline Analytics**: Revenue forecasting and win rate predictions.`
}
