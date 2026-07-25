import { Building2, Users } from '@/components/ui/icons'

function CompanyOverviewCard({ company }) {
  const metrics = [
    ['Industry', company.industry],
    ['Employee count', company.employees],
    ['Annual revenue', company.revenue],
    ['Headquarters', company.headquarters],
  ]

  return (
    <article className="card xl:col-span-1">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-surface bg-surface-muted text-ink-secondary"><Building2 className="size-5" /></span>
          <div><h2 className="text-lg font-semibold text-ink-primary">{company.name}</h2><p className="mt-0.5 text-sm text-ink-muted">{company.domain}</p></div>
        </div>
        <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700">{company.stage}</span>
      </div>

      <dl className="mt-6 divide-y divide-line-default border-y border-line-default">
        {metrics.map(([label, value]) => (
          <div className="flex items-center justify-between gap-4 py-3" key={label}>
            <dt className="text-sm text-ink-muted">{label}</dt>
            <dd className="text-right text-sm font-medium text-ink-primary">{value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-5 flex items-center gap-2 text-sm text-ink-secondary"><Users className="size-4 text-ink-muted" />Account profile prepared from local intelligence data</div>
    </article>
  )
}

export default CompanyOverviewCard
