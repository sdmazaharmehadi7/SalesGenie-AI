import { AlertTriangle } from 'lucide-react'

import Button from '@/components/ui/Button'
import CompanyIntelligence, { LeadScoreCard, RecommendationList } from '@/features/companies/components/CompanyIntelligence'
import CompanyOverviewCard from '@/features/companies/components/CompanyOverviewCard'
import CompanySearch from '@/features/companies/components/CompanySearch'
import { useCompanyIntelligence } from '@/features/companies/hooks/useCompanyIntelligence'

function CompaniesPage() {
  const {
    companies,
    isLoading,
    error,
    reload,
    selectedId,
    setSelectedId,
    insight,
    score,
    isDetailLoading,
    detailError,
    isGenerating,
    generateProfile,
  } = useCompanyIntelligence()

  const selectedCompany = companies.find((company) => company.id === selectedId) ?? null

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="max-w-2xl">
        <p className="text-sm font-medium text-brand-600">Account intelligence</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-ink-primary">Company analysis</h1>
        <p className="mt-2 text-sm leading-6 text-ink-muted">Evaluate account fit, surface buying signals, and prepare focused next steps.</p>
      </header>

      {error ? (
        <div className="card flex items-center gap-3 border border-rose-200 bg-rose-50 p-4 text-rose-800">
          <AlertTriangle className="size-5 shrink-0" />
          <div className="flex-1 text-sm">
            <p className="font-semibold">Couldn't load companies</p>
            <p className="text-rose-700/90">{error}</p>
          </div>
          <Button onClick={reload} variant="secondary">Try again</Button>
        </div>
      ) : null}

      {isLoading ? (
        <div className="card p-10 text-center text-sm text-ink-muted">Loading companies…</div>
      ) : companies.length === 0 ? (
        <div className="card flex flex-col items-center justify-center gap-2 p-12 text-center border-dashed border-2">
          <h3 className="text-base font-semibold text-ink-primary">No companies found</h3>
          <p className="max-w-md text-xs leading-relaxed text-ink-muted">
            Create a lead in Lead Management to see it here as a company profile.
          </p>
        </div>
      ) : (
        <>
          <CompanySearch companies={companies} onSelect={setSelectedId} selectedCompanyId={selectedId} />

          {selectedCompany ? (
            <>
              <section className="grid gap-6 xl:grid-cols-3">
                <CompanyOverviewCard company={selectedCompany} />
                <CompanyIntelligence
                  insight={insight}
                  isLoading={isDetailLoading}
                  isGenerating={isGenerating}
                  error={detailError}
                  onGenerate={() => generateProfile(selectedCompany.id)}
                />
              </section>

              <section className="grid gap-6 lg:grid-cols-3">
                <LeadScoreCard score={score} isLoading={isDetailLoading} />
                <RecommendationList insight={insight} isLoading={isDetailLoading} />
              </section>
            </>
          ) : null}
        </>
      )}
    </div>
  )
}

export default CompaniesPage
