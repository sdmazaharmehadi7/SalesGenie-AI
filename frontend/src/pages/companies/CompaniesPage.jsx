import { useState } from 'react'

import CompanyIntelligence, { LeadScoreCard, RecommendationList } from '@/features/companies/components/CompanyIntelligence'
import CompanyOverviewCard from '@/features/companies/components/CompanyOverviewCard'
import CompanySearch from '@/features/companies/components/CompanySearch'

const companies = [
  {
    id: 'northstar', name: 'Northstar Labs', domain: 'northstarlabs.com', industry: 'B2B SaaS', employees: '201–500', revenue: '$35M–$50M', headquarters: 'San Francisco, CA', stage: 'Growth', score: 84,
    insights: ['Recently expanded its revenue operations team, signaling an active investment in sales tooling.', 'Hiring activity in sales engineering suggests a complex evaluation process with multiple stakeholders.', 'The company’s public roadmap mentions workflow automation as a priority for the second half of the year.'],
    recommendations: ['Prioritize a discovery call with revenue operations and sales leadership.', 'Tailor outreach around reducing manual handoffs in the lead-to-opportunity workflow.', 'Reference the recent sales engineering expansion when positioning team collaboration features.'],
  },
  {
    id: 'orbit', name: 'Orbit Systems', domain: 'orbit.co', industry: 'Cloud Infrastructure', employees: '501–1,000', revenue: '$80M–$100M', headquarters: 'Austin, TX', stage: 'Scale', score: 72,
    insights: ['The company has grown its distributed engineering teams across North America and Europe.', 'Its current technology stack indicates a focus on consolidating operational reporting.', 'Leadership is emphasizing efficient growth and predictable pipeline coverage in recent updates.'],
    recommendations: ['Engage the operations team with a consolidation and reporting narrative.', 'Map stakeholders across sales, customer success, and engineering operations.', 'Share a concise business case focused on predictable pipeline performance.'],
  },
  {
    id: 'pine', name: 'Pine & Co.', domain: 'pine.co', industry: 'Professional Services', employees: '51–200', revenue: '$10M–$25M', headquarters: 'New York, NY', stage: 'Expansion', score: 68,
    insights: ['Pine & Co. is growing its client advisory practice and adding account-management roles.', 'The organization is active in several verticals with varied sales cycles and handoff needs.', 'A recent partner announcement points to broader enterprise ambitions.'],
    recommendations: ['Lead with a simple rollout plan that supports multiple sales motions.', 'Identify the team responsible for account expansion before scheduling a demo.', 'Use client visibility and handoff consistency as the core value proposition.'],
  },
]

function CompaniesPage() {
  const [selectedCompanyId, setSelectedCompanyId] = useState(companies[0].id)
  const selectedCompany = companies.find((company) => company.id === selectedCompanyId) ?? companies[0]

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="max-w-2xl">
        <p className="text-sm font-medium text-brand-600">Account intelligence</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-ink-primary">Company analysis</h1>
        <p className="mt-2 text-sm leading-6 text-ink-muted">Evaluate account fit, surface buying signals, and prepare focused next steps.</p>
      </header>

      <CompanySearch companies={companies} onSelect={setSelectedCompanyId} selectedCompanyId={selectedCompanyId} />

      <section className="grid gap-6 xl:grid-cols-3">
        <CompanyOverviewCard company={selectedCompany} />
        <CompanyIntelligence insights={selectedCompany.insights} />
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <LeadScoreCard company={selectedCompany} />
        <RecommendationList recommendations={selectedCompany.recommendations} />
      </section>
    </div>
  )
}

export default CompaniesPage
