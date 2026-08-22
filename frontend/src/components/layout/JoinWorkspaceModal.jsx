import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWorkspace } from '@/context/WorkspaceContext'
import { useToast } from '@/context/ToastContext'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { CheckCircle2, Mail, Users, X } from '@/components/ui/icons'

const SAMPLE_INVITE_CODES = ['WS-ALPHA-8492', 'INV-SALES-2026', 'XYZ-CORP']

export default function JoinWorkspaceModal({ isOpen, onClose }) {
  const navigate = useNavigate()
  const { joinWorkspace } = useWorkspace()
  const { showToast } = useToast()

  const [inviteCode, setInviteCode] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isOpen) return null

  function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!inviteCode.trim()) {
      setError('Please enter a valid invitation code or token.')
      return
    }

    setIsSubmitting(true)
    setTimeout(() => {
      const result = joinWorkspace({ inviteCode: inviteCode.trim() })
      if (!result.success) {
        setError(result.error)
        setIsSubmitting(false)
        return
      }

      setIsSubmitting(false)
      showToast(`Joined ${result.workspace.name} as Team Member!`, 'success')
      onClose()
      navigate('/dashboard', { replace: true })
    }, 300)
  }

  function handleSelectSampleCode(code) {
    setInviteCode(code)
    setError('')
  }

  return (
    <div
      aria-labelledby="join-workspace-title"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
    >
      {/* Backdrop */}
      <div
        aria-hidden="true"
        className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-lg rounded-card border border-line-default bg-surface-default p-6 shadow-overlay animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-line-default pb-4">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-control bg-emerald-50 text-emerald-600">
              <Users className="size-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-ink-primary" id="join-workspace-title">
                Join a Workspace
              </h2>
              <p className="text-xs text-ink-muted">
                Accept an invitation and collaborate with your team
              </p>
            </div>
          </div>

          <button
            aria-label="Close dialog"
            className="rounded-control p-1 text-ink-muted hover:bg-surface-muted hover:text-ink-primary"
            onClick={onClose}
            type="button"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Form Body */}
        <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
          
          {/* Invitation Code Input */}
          <div>
            <Input
              autoFocus
              label="Invitation Code or Token"
              name="inviteCode"
              placeholder="e.g. WS-ALPHA-8492 or invite link"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              required
            />
            <p className="mt-1 text-[11px] text-ink-muted">
              Enter the unique workspace code or token shared by your manager.
            </p>
          </div>

          {/* Quick Demo Sample Codes */}
          <div>
            <span className="text-[11px] font-medium text-ink-muted">Try sample invite codes:</span>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {SAMPLE_INVITE_CODES.map((code) => (
                <button
                  key={code}
                  className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50/70 px-2.5 py-0.5 text-xs font-medium text-emerald-800 transition-colors hover:bg-emerald-100 hover:border-emerald-300"
                  onClick={() => handleSelectSampleCode(code)}
                  type="button"
                >
                  <span>{code}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Team Member Role Notice */}
          <div className="flex items-start gap-2.5 rounded-control border border-emerald-100 bg-emerald-50/70 p-3 text-xs text-emerald-950">
            <CheckCircle2 className="size-4 shrink-0 text-emerald-600 mt-0.5" />
            <div>
              <span className="font-semibold text-emerald-800">Team Member Access:</span>
              <p className="mt-0.5 text-ink-secondary">
                You will join this workspace with the <strong>Team Member</strong> role, gaining access to shared CRM pipelines, contacts, and collaborative AI forecasting tools.
              </p>
            </div>
          </div>

          {error && (
            <div className="rounded-control border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs text-rose-700">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-line-default">
            <Button onClick={onClose} type="button" variant="outline">
              Cancel
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? 'Joining Workspace…' : 'Join Workspace'}
            </Button>
          </div>

        </form>
      </div>
    </div>
  )
}
