import { Mail, Sparkles } from 'lucide-react'
import { useOutreachGenerator } from '../hooks/useOutreachGenerator'
import { EmailPreview } from './EmailPreview'
import { GenerationHistory } from './GenerationHistory'
import { ProspectForm } from './ProspectForm'

export function OutreachLayout() {
  const {
    formData,
    updateFormField,
    loadSampleProspect,
    generatedEmail,
    isGenerating,
    generateEmail,
    regenerateEmail,
    selectSubject,
    updateBody,
    copyEmailToClipboard,
    copySuccess,
    downloadEmailAsTxt,
    history,
    toneOptions,
    lengthOptions,
    industryOptions,
    sampleProspects,
  } = useOutreachGenerator()

  return (
    <div className="space-y-6">
      {/* Top Title Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-card border border-line-default bg-surface-default p-5 shadow-card">
        <div>
          <div className="flex items-center space-x-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-control bg-brand-50 text-brand-600 border border-brand-100">
              <Mail className="h-4 w-4" />
            </div>
            <h1 className="text-xl font-bold text-ink-primary">AI Outreach Generator</h1>
            <span className="inline-flex items-center space-x-1 rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700 border border-brand-100">
              <Sparkles className="h-3 w-3 text-brand-500" />
              <span>SalesGenie Engine v2.4</span>
            </span>
          </div>
          <p className="text-xs text-ink-muted mt-1">
            Create high-converting cold email sequences tailored to your target prospect, persona, industry, and pain points.
          </p>
        </div>
      </div>

      {/* Main 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Form & Selectors */}
        <div className="lg:col-span-5">
          <ProspectForm
            formData={formData}
            onFieldChange={updateFormField}
            onLoadSample={loadSampleProspect}
            onGenerate={generateEmail}
            isGenerating={isGenerating}
            toneOptions={toneOptions}
            lengthOptions={lengthOptions}
            industryOptions={industryOptions}
            sampleProspects={sampleProspects}
          />
        </div>

        {/* Right Column: Preview & History */}
        <div className="lg:col-span-7 space-y-6">
          <EmailPreview
            generatedEmail={generatedEmail}
            isGenerating={isGenerating}
            onSelectSubject={selectSubject}
            onUpdateBody={updateBody}
            onCopy={copyEmailToClipboard}
            copySuccess={copySuccess}
            onDownload={downloadEmailAsTxt}
            onRegenerate={regenerateEmail}
          />

          <GenerationHistory
            history={history}
            onSelectDraft={(draft) => {
              // restore draft
              selectSubject(draft.selectedSubject)
              updateBody(draft.body)
            }}
          />
        </div>
      </div>
    </div>
  )
}
