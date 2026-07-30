import { AlertCircle, Mail, Sparkles } from 'lucide-react'

import { useOutreachGenerator } from '../hooks/useOutreachGenerator'
import { EmailPreview } from './EmailPreview'
import { GenerationHistory } from './GenerationHistory'
import { LeadSelector } from './LeadSelector'

export function OutreachLayout() {
  const {
    leads,
    leadsLoading,
    selectedLeadId,
    selectedLead,
    selectLead,

    campaign,
    isGenerating,
    isSaving,
    isSending,
    error,

    generateEmail,
    updateSubject,
    updateBody,
    saveDraft,
    sendEmail,

    history,
    isHistoryLoading,
    selectCampaignFromHistory,

    copyEmailToClipboard,
    copySuccess,
    downloadEmailAsTxt,
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
            Select an existing lead and generate a personalized AI outreach email based on its profile and intelligence.
          </p>
        </div>
      </div>

      {error && (
        <div className="flex items-center space-x-2 rounded-control border border-danger/30 bg-danger/5 px-4 py-3 text-xs font-medium text-danger">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Lead Selection */}
        <div className="lg:col-span-5">
          <LeadSelector
            leads={leads}
            leadsLoading={leadsLoading}
            selectedLeadId={selectedLeadId}
            selectedLead={selectedLead}
            onLeadSelect={selectLead}
            onGenerate={generateEmail}
            isGenerating={isGenerating}
          />
        </div>

        {/* Right Column: Preview & History */}
        <div className="lg:col-span-7 space-y-6">
          <EmailPreview
            campaign={campaign}
            isGenerating={isGenerating}
            isSaving={isSaving}
            isSending={isSending}
            onUpdateSubject={updateSubject}
            onUpdateBody={updateBody}
            onSaveDraft={saveDraft}
            onSend={sendEmail}
            onCopy={copyEmailToClipboard}
            copySuccess={copySuccess}
            onDownload={downloadEmailAsTxt}
          />

          <GenerationHistory
            history={history}
            isLoading={isHistoryLoading}
            activeCampaignId={campaign?.id}
            onSelectCampaign={selectCampaignFromHistory}
          />
        </div>
      </div>
    </div>
  )
}
