import { useState } from 'react'
import {
  X,
  Mail,
  Calendar,
  FileText,
  User,
  Sparkles,
  Building2,
  Phone,
  MapPin,
  Check,
  Copy,
  Send,
  Clock,
  Briefcase,
  ShieldCheck,
  DollarSign,
  TrendingUp,
  MessageSquare,
} from 'lucide-react'

// ── Profile Modal ────────────────────────────────────────────────────────────
export function ProfileModal({ lead, onClose }) {
  if (!lead) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink-primary/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-surface bg-surface-default shadow-overlay">
        {/* Header Banner */}
        <div className="relative bg-gradient-to-r from-brand-600 to-indigo-700 p-6 text-white">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 rounded-full bg-white/20 p-1.5 text-white hover:bg-white/30 transition-colors"
          >
            <X className="size-5" />
          </button>
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="grid size-16 shrink-0 place-items-center rounded-full bg-white/20 text-2xl font-bold border-2 border-white/40">
              {lead.avatar}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-2xl font-bold">{lead.name}</h2>
                <span className="rounded-full bg-white/20 px-3 py-0.5 text-xs font-semibold text-white">
                  Score: {lead.score}/100
                </span>
                <span className="rounded-full bg-emerald-400/20 text-emerald-200 border border-emerald-300/30 px-2.5 py-0.5 text-xs font-medium">
                  {lead.buyingIntent} Intent
                </span>
              </div>
              <p className="text-brand-100 text-sm mt-1">
                {lead.title} at <span className="font-semibold text-white">{lead.company}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6">
          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-card bg-surface-muted p-3">
              <p className="text-xs text-ink-muted">Estimated Deal Value</p>
              <p className="text-lg font-bold text-ink-primary mt-0.5">{lead.estimatedDealValue}</p>
            </div>
            <div className="rounded-card bg-surface-muted p-3">
              <p className="text-xs text-ink-muted">Decision Maker</p>
              <p className="text-lg font-bold text-ink-primary mt-0.5">{lead.isDecisionMaker ? 'Yes' : 'No'}</p>
            </div>
            <div className="rounded-card bg-surface-muted p-3">
              <p className="text-xs text-ink-muted">Company Size</p>
              <p className="text-lg font-bold text-ink-primary mt-0.5">{lead.companySize} emp</p>
            </div>
            <div className="rounded-card bg-surface-muted p-3">
              <p className="text-xs text-ink-muted">Status</p>
              <p className="text-lg font-bold text-brand-600 mt-0.5">{lead.status}</p>
            </div>
          </div>

          {/* Contact Details */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-muted mb-3">
              Contact Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2.5 text-ink-secondary">
                <Mail className="size-4 text-ink-muted shrink-0" />
                <span>{lead.email}</span>
              </div>
              <div className="flex items-center gap-2.5 text-ink-secondary">
                <Phone className="size-4 text-ink-muted shrink-0" />
                <span>{lead.phone}</span>
              </div>
              <div className="flex items-center gap-2.5 text-ink-secondary">
                <Building2 className="size-4 text-ink-muted shrink-0" />
                <span>{lead.industry} Industry</span>
              </div>
              <div className="flex items-center gap-2.5 text-ink-secondary">
                <MapPin className="size-4 text-ink-muted shrink-0" />
                <span>{lead.location}</span>
              </div>
            </div>
          </div>

          {/* AI Insights Card inside Modal */}
          <div className="rounded-card border border-brand-200 bg-gradient-to-br from-brand-50/60 to-indigo-50/60 p-4 space-y-3">
            <div className="flex items-center gap-2 text-brand-700 font-semibold text-sm">
              <Sparkles className="size-4 text-brand-600" />
              <span>AI Lead Intelligence Deep Dive</span>
            </div>
            <p className="text-sm text-ink-secondary leading-relaxed">
              {lead.aiInsights.whyPromising}
            </p>
            <div>
              <p className="text-xs font-semibold text-ink-primary uppercase tracking-wider mb-1.5">
                Key Pain Points
              </p>
              <ul className="space-y-1">
                {lead.aiInsights.painPoints.map((point, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-xs text-ink-secondary">
                    <span className="size-1.5 rounded-full bg-brand-500 mt-1.5 shrink-0" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-line-default p-4 bg-surface-muted/50 flex justify-end gap-2">
          <button onClick={onClose} className="btn btn-secondary btn-sm">
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Email Generator Modal ───────────────────────────────────────────────────
export function EmailModal({ lead, onClose }) {
  const [copied, setCopied] = useState(false)
  const [tone, setTone] = useState('Consultative & Value-Focused')
  const [generating, setGenerating] = useState(false)

  if (!lead) return null

  const defaultSubject = `Quick question regarding ${lead.company}'s sales workflow`
  const defaultBody = `Hi ${lead.name.split(' ')[0]},\n\nI noticed ${lead.company} is expanding rapidly in the ${lead.industry} space. Congrats on the growth!\n\nMany sales leaders we speak with mention that reps spend upwards of 14 hours a week manually drafting outreach emails and updating lead scores.\n\nWith SalesGenie AI, team leaders like yourself can automate 80% of routine outreach while increasing response rates by 35%.\n\nWould you be open to a brief 10-minute overview this Thursday morning?\n\nBest regards,\nSalesGenie AI Team`

  const [subject, setSubject] = useState(defaultSubject)
  const [body, setBody] = useState(defaultBody)

  const handleRegenerate = () => {
    setGenerating(true)
    setTimeout(() => {
      setSubject(`Tailored AI Solution for ${lead.company}`)
      setBody(
        `Hi ${lead.name.split(' ')[0]},\n\nBased on your focus at ${lead.company}, I put together a quick breakdown of how automated lead intelligence can address key bottlenecks in your sales pipeline.\n\nRecommended next step: ${lead.aiInsights.suggestedNextAction}.\n\nLet me know if you'd like me to send over the custom deck!\n\nBest,\nSalesGenie AI Team`
      )
      setGenerating(false)
    }, 600)
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink-primary/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl rounded-surface bg-surface-default shadow-overlay overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line-default px-6 py-4 bg-surface-default">
          <div className="flex items-center gap-2">
            <Sparkles className="size-5 text-brand-600" />
            <h3 className="font-semibold text-ink-primary">AI Email Generator — {lead.name}</h3>
          </div>
          <button onClick={onClose} className="rounded-control p-1 text-ink-muted hover:bg-surface-muted">
            <X className="size-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-card bg-brand-50/70 p-3 border border-brand-100 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-medium text-brand-700">Target Contact:</span>
              <span className="text-ink-primary">{lead.name} ({lead.title} @ {lead.company})</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-ink-muted">Tone:</span>
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className="input h-7 py-0 px-2 text-xs bg-white"
              >
                <option>Consultative & Value-Focused</option>
                <option>Direct & Short</option>
                <option>Executive Pitch</option>
                <option>Follow-Up</option>
              </select>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-ink-muted mb-1">Subject Line</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="input text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-muted mb-1">Email Body</label>
              <textarea
                rows={8}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="input h-auto text-sm py-3 leading-relaxed font-sans"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-line-default p-4 bg-surface-muted/50 flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={handleRegenerate}
            disabled={generating}
            className="btn btn-secondary btn-sm gap-1.5"
          >
            <Sparkles className="size-3.5 text-brand-600" />
            {generating ? 'Generating...' : 'Regenerate Email'}
          </button>
          <div className="flex items-center gap-2">
            <button onClick={handleCopy} className="btn btn-secondary btn-sm gap-1.5">
              {copied ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
              {copied ? 'Copied to Clipboard' : 'Copy Text'}
            </button>
            <button onClick={onClose} className="btn btn-primary btn-sm gap-1.5">
              <Send className="size-3.5" />
              Send via Email App
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Meeting Scheduler Modal ──────────────────────────────────────────────────
export function MeetingModal({ lead, onClose }) {
  const [booked, setBooked] = useState(false)
  const [date, setDate] = useState('2026-07-28')
  const [time, setTime] = useState('10:30 AM')
  const [duration, setDuration] = useState('30 min')

  if (!lead) return null

  const handleSchedule = (e) => {
    e.preventDefault()
    setBooked(true)
    setTimeout(() => {
      onClose()
    }, 1500)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink-primary/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-surface bg-surface-default shadow-overlay overflow-hidden">
        <div className="flex items-center justify-between border-b border-line-default px-6 py-4">
          <div className="flex items-center gap-2">
            <Calendar className="size-5 text-brand-600" />
            <h3 className="font-semibold text-ink-primary">Schedule Meeting</h3>
          </div>
          <button onClick={onClose} className="rounded-control p-1 text-ink-muted hover:bg-surface-muted">
            <X className="size-4" />
          </button>
        </div>

        {booked ? (
          <div className="p-8 text-center space-y-3">
            <div className="mx-auto grid size-12 place-items-center rounded-full bg-emerald-100 text-emerald-600">
              <Check className="size-6" />
            </div>
            <h4 className="text-lg font-bold text-ink-primary">Meeting Scheduled!</h4>
            <p className="text-sm text-ink-muted">
              Calendar invite sent to <span className="font-medium text-ink-primary">{lead.email}</span>.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSchedule} className="p-6 space-y-4">
            <div className="rounded-card bg-surface-muted p-3 text-xs space-y-1">
              <p className="font-medium text-ink-primary">{lead.name} — {lead.company}</p>
              <p className="text-ink-muted">Best Time (AI recommendation): {lead.aiInsights.bestTimeToContact}</p>
            </div>

            <div className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-medium text-ink-muted mb-1">Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="input"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-ink-muted mb-1">Time</label>
                  <select value={time} onChange={(e) => setTime(e.target.value)} className="input cursor-pointer">
                    <option>09:00 AM</option>
                    <option>10:30 AM</option>
                    <option>02:00 PM</option>
                    <option>04:00 PM</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink-muted mb-1">Duration</label>
                  <select value={duration} onChange={(e) => setDuration(e.target.value)} className="input cursor-pointer">
                    <option>15 min</option>
                    <option>30 min</option>
                    <option>45 min</option>
                    <option>60 min</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-ink-muted mb-1">Meeting Title</label>
                <input
                  type="text"
                  defaultValue={`Discovery Call — SalesGenie & ${lead.company}`}
                  className="input"
                />
              </div>
            </div>

            <div className="border-t border-line-default pt-4 flex justify-end gap-2">
              <button type="button" onClick={onClose} className="btn btn-secondary btn-sm">
                Cancel
              </button>
              <button type="submit" className="btn btn-primary btn-sm">
                Confirm & Send Invite
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

// ── Add Note Modal ────────────────────────────────────────────────────────────
export function NoteModal({ lead, onClose, onAddNote }) {
  const [noteText, setNoteText] = useState('')

  if (!lead) return null

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!noteText.trim()) return
    if (onAddNote) {
      onAddNote(lead.id, noteText)
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink-primary/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-surface bg-surface-default shadow-overlay overflow-hidden">
        <div className="flex items-center justify-between border-b border-line-default px-6 py-4">
          <div className="flex items-center gap-2">
            <FileText className="size-5 text-brand-600" />
            <h3 className="font-semibold text-ink-primary">Add Note — {lead.name}</h3>
          </div>
          <button onClick={onClose} className="rounded-control p-1 text-ink-muted hover:bg-surface-muted">
            <X className="size-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-ink-muted mb-1">Note Content</label>
            <textarea
              rows={4}
              placeholder="e.g. Discussed budget constraints. Follow up with updated ROI sheet next Tuesday..."
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              className="input h-auto text-sm py-2.5"
              required
            />
          </div>

          <div className="border-t border-line-default pt-4 flex justify-end gap-2">
            <button type="button" onClick={onClose} className="btn btn-secondary btn-sm">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary btn-sm">
              Save Note
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
