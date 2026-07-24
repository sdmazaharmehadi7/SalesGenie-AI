import { Building2, Sparkles, User, Zap } from 'lucide-react'
import { LengthSelector } from './LengthSelector'
import { ToneSelector } from './ToneSelector'

export function ProspectForm({
  formData,
  onFieldChange,
  onLoadSample,
  onGenerate,
  isGenerating,
  toneOptions,
  lengthOptions,
  industryOptions,
  sampleProspects,
}) {
  return (
    <div className="rounded-card border border-line-default bg-surface-default p-5 shadow-card space-y-5">
      {/* Header & Quick Fill */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line-default pb-4">
        <div>
          <h2 className="text-base font-bold text-ink-primary flex items-center space-x-2">
            <User className="h-4 w-4 text-brand-600" />
            <span>Prospect Information</span>
          </h2>
          <p className="text-xs text-ink-muted">
            Provide prospect details to generate a hyper-personalized outreach sequence.
          </p>
        </div>

        {/* Quick Sample Fill */}
        <div className="flex items-center space-x-2">
          <span className="text-[11px] font-medium text-ink-muted flex items-center space-x-1">
            <Zap className="h-3 w-3 text-amber-500" />
            <span>Quick Samples:</span>
          </span>
          {sampleProspects.map((sample, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => onLoadSample(sample)}
              className="rounded-full border border-line-default bg-surface-subtle px-2.5 py-1 text-[11px] font-medium text-ink-secondary hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 transition-colors"
            >
              {sample.companyName}
            </button>
          ))}
        </div>
      </div>

      {/* Form Fields Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Prospect Name */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-ink-primary">
            Prospect Name <span className="text-danger">*</span>
          </label>
          <input
            type="text"
            value={formData.prospectName}
            onChange={(e) => onFieldChange('prospectName', e.target.value)}
            placeholder="e.g. Sarah Jenkins"
            className="w-full rounded-control border border-line-default bg-surface-default px-3 py-2 text-xs text-ink-primary placeholder:text-ink-muted focus:border-brand-500 focus:outline-hidden focus:ring-1 focus:ring-brand-500"
          />
        </div>

        {/* Job Title / Persona */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-ink-primary">
            Job Title / Persona <span className="text-danger">*</span>
          </label>
          <input
            type="text"
            value={formData.jobTitle}
            onChange={(e) => onFieldChange('jobTitle', e.target.value)}
            placeholder="e.g. Chief Technology Officer"
            className="w-full rounded-control border border-line-default bg-surface-default px-3 py-2 text-xs text-ink-primary placeholder:text-ink-muted focus:border-brand-500 focus:outline-hidden focus:ring-1 focus:ring-brand-500"
          />
        </div>

        {/* Company Name */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-ink-primary">
            Company Name <span className="text-danger">*</span>
          </label>
          <div className="relative">
            <Building2 className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-muted" />
            <input
              type="text"
              value={formData.companyName}
              onChange={(e) => onFieldChange('companyName', e.target.value)}
              placeholder="e.g. Acme Corp"
              className="w-full rounded-control border border-line-default bg-surface-default py-2 pl-8 pr-3 text-xs text-ink-primary placeholder:text-ink-muted focus:border-brand-500 focus:outline-hidden focus:ring-1 focus:ring-brand-500"
            />
          </div>
        </div>

        {/* Industry */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-ink-primary">
            Target Industry
          </label>
          <select
            value={formData.industry}
            onChange={(e) => onFieldChange('industry', e.target.value)}
            className="w-full rounded-control border border-line-default bg-surface-default px-3 py-2 text-xs text-ink-primary focus:border-brand-500 focus:outline-hidden focus:ring-1 focus:ring-brand-500"
          >
            {industryOptions.map((ind, idx) => (
              <option key={idx} value={ind}>
                {ind}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Pain Point / Opportunity */}
      <div className="space-y-1">
        <label className="text-xs font-semibold text-ink-primary">
          Key Prospect Pain Point / Friction <span className="text-danger">*</span>
        </label>
        <textarea
          rows={2}
          value={formData.painPoint}
          onChange={(e) => onFieldChange('painPoint', e.target.value)}
          placeholder="e.g. SDR reps spend 40% of their time manually researching leads instead of dialing."
          className="w-full resize-none rounded-control border border-line-default bg-surface-default px-3 py-2 text-xs text-ink-primary placeholder:text-ink-muted focus:border-brand-500 focus:outline-hidden focus:ring-1 focus:ring-brand-500"
        />
      </div>

      {/* Product Value Prop */}
      <div className="space-y-1">
        <label className="text-xs font-semibold text-ink-primary">
          Your Product Value Proposition
        </label>
        <input
          type="text"
          value={formData.valueProp}
          onChange={(e) => onFieldChange('valueProp', e.target.value)}
          placeholder="e.g. SalesGenie AI automates lead scoring and real-time email generation."
          className="w-full rounded-control border border-line-default bg-surface-default px-3 py-2 text-xs text-ink-primary placeholder:text-ink-muted focus:border-brand-500 focus:outline-hidden focus:ring-1 focus:ring-brand-500"
        />
      </div>

      {/* Selectors */}
      <ToneSelector
        options={toneOptions}
        selectedTone={formData.tone}
        onChange={(t) => onFieldChange('tone', t)}
      />

      <LengthSelector
        options={lengthOptions}
        selectedLength={formData.length}
        onChange={(l) => onFieldChange('length', l)}
      />

      {/* Generate CTA Button */}
      <button
        type="button"
        onClick={onGenerate}
        disabled={isGenerating || !formData.prospectName || !formData.companyName}
        className="flex w-full items-center justify-center space-x-2 rounded-control bg-brand-500 py-3 text-sm font-semibold text-ink-inverse shadow-card transition-all hover:bg-brand-600 focus:outline-hidden disabled:opacity-50"
      >
        <Sparkles className={`h-4 w-4 ${isGenerating ? 'animate-spin' : ''}`} />
        <span>{isGenerating ? 'Generating AI Email...' : 'Generate Email Sequence'}</span>
      </button>
    </div>
  )
}
