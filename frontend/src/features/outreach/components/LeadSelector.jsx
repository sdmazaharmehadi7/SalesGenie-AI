import { Building2, Mail as MailIcon, Sparkles, User } from 'lucide-react'

import StatusBadge from '@/components/ui/StatusBadge'

export function LeadSelector({
  leads,
  leadsLoading,
  selectedLeadId,
  selectedLead,
  onLeadSelect,
  onGenerate,
  isGenerating,
}) {
  return (
    <div className="rounded-card border border-line-default bg-surface-default p-5 shadow-card space-y-5">
      <div>
        <h2 className="text-base font-bold text-ink-primary flex items-center space-x-2">
          <User className="h-4 w-4 text-brand-600" />
          <span>Select Lead</span>
        </h2>
        <p className="text-xs text-ink-muted">
          Choose a lead from your pipeline to generate a personalized outreach email.
        </p>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-semibold text-ink-primary">Lead</label>
        <select
          value={selectedLeadId || ''}
          onChange={(e) => onLeadSelect(e.target.value)}
          disabled={leadsLoading}
          className="w-full rounded-control border border-line-default bg-surface-default px-3 py-2 text-xs text-ink-primary focus:border-brand-500 focus:outline-hidden focus:ring-1 focus:ring-brand-500 disabled:opacity-50"
        >
          <option value="">{leadsLoading ? 'Loading leads...' : 'Select a lead'}</option>
          {leads.map((lead) => (
            <option key={lead.id} value={lead.id}>
              {lead.contact_name || 'Unnamed Contact'} - {lead.company_name}
            </option>
          ))}
        </select>
      </div>

      {selectedLead ? (
        <div className="space-y-3 rounded-control border border-line-default bg-surface-subtle p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-ink-primary">Lead Details</h3>
            <StatusBadge status={selectedLead.lead_status} />
          </div>
          <dl className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <dt className="flex items-center space-x-1.5 text-[11px] text-ink-muted">
                <User className="h-3 w-3" />
                <span>Contact</span>
              </dt>
              <dd className="text-xs font-medium text-ink-primary text-right truncate">
                {selectedLead.contact_name || '—'}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="flex items-center space-x-1.5 text-[11px] text-ink-muted">
                <Building2 className="h-3 w-3" />
                <span>Company</span>
              </dt>
              <dd className="text-xs font-medium text-ink-primary text-right truncate">
                {selectedLead.company_name || '—'}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-[11px] text-ink-muted">Industry</dt>
              <dd className="text-xs font-medium text-ink-primary text-right truncate">
                {selectedLead.industry || '—'}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="flex items-center space-x-1.5 text-[11px] text-ink-muted">
                <MailIcon className="h-3 w-3" />
                <span>Email</span>
              </dt>
              <dd className="text-xs font-medium text-ink-primary text-right truncate">
                {selectedLead.email || '—'}
              </dd>
            </div>
          </dl>
        </div>
      ) : (
        <div className="rounded-control border border-dashed border-line-default bg-surface-subtle p-4 text-center text-xs text-ink-muted">
          Select a lead above to view its details.
        </div>
      )}

      <button
        type="button"
        onClick={onGenerate}
        disabled={isGenerating || !selectedLeadId}
        className="flex w-full items-center justify-center space-x-2 rounded-control bg-brand-500 py-3 text-sm font-semibold text-ink-inverse shadow-card transition-all hover:bg-brand-600 focus:outline-hidden disabled:opacity-50"
      >
        <Sparkles className={`h-4 w-4 ${isGenerating ? 'animate-spin' : ''}`} />
        <span>{isGenerating ? 'Generating AI Email...' : 'Generate Outreach Email'}</span>
      </button>
    </div>
  )
}
