import { useMemo, useState } from 'react'

import { Building2, Search } from '@/components/ui/icons'

function CompanySearch({ companies, onSelect, selectedCompanyId }) {
  const [query, setQuery] = useState('')
  const filteredCompanies = useMemo(() => companies.filter((company) => `${company.name} ${company.domain} ${company.industry}`.toLowerCase().includes(query.toLowerCase())), [companies, query])
  const selectedCompany = companies.find((company) => company.id === selectedCompanyId)

  function selectCompany(company) {
    onSelect(company.id)
    setQuery('')
  }

  return (
    <section className="card p-4">
      <label className="block text-sm font-medium text-ink-secondary" htmlFor="company-search">Company search</label>
      <div className="relative mt-2">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted" />
        <input
          autoComplete="off"
          className="input pl-9"
          id="company-search"
          onChange={(event) => setQuery(event.target.value)}
          placeholder={selectedCompany ? `Search companies or select ${selectedCompany.name}` : 'Search companies'}
          value={query}
        />
        {query ? (
          <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-20 overflow-hidden rounded-card border border-line-default bg-surface-default p-1.5 shadow-floating">
            {filteredCompanies.length > 0 ? filteredCompanies.map((company) => (
              <button className="flex w-full items-center gap-3 rounded-control px-3 py-2.5 text-left hover:bg-surface-muted" key={company.id} onClick={() => selectCompany(company)} type="button">
                <span className="grid size-8 shrink-0 place-items-center rounded-control bg-surface-muted text-ink-muted"><Building2 className="size-4" /></span>
                <span className="min-w-0"><span className="block truncate text-sm font-medium text-ink-primary">{company.name}</span><span className="block truncate text-xs text-ink-muted">{company.domain} · {company.industry}</span></span>
              </button>
            )) : <p className="px-3 py-4 text-sm text-ink-muted">No companies found.</p>}
          </div>
        ) : null}
      </div>
    </section>
  )
}

export default CompanySearch
