import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWorkspace } from '@/context/WorkspaceContext'
import { useToast } from '@/context/ToastContext'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { Building2, Crown, X } from '@/components/ui/icons'

export default function CreateWorkspaceModal({ isOpen, onClose }) {
  const navigate = useNavigate()
  const { createWorkspace } = useWorkspace()
  const { showToast } = useToast()

  const [workspaceName, setWorkspaceName] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isOpen) return null

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!workspaceName.trim()) {
      setError('Please enter a workspace name.')
      return
    }

    setIsSubmitting(true)
    try {
      const newWs = await createWorkspace({
        name: workspaceName.trim(),
        description: description.trim(),
      })
      showToast(`Workspace "${newWs.name}" created! You are the Manager.`, 'success')
      onClose()
      navigate('/dashboard', { replace: true })
    } catch (err) {
      const msg =
        err?.response?.data?.detail ||
        'Failed to create workspace. Please try again.'
      setError(Array.isArray(msg) ? msg.map((m) => m.msg).join(', ') : String(msg))
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleClose() {
    setWorkspaceName('')
    setDescription('')
    setError('')
    onClose()
  }

  return (
    <div
      aria-labelledby="create-workspace-title"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
    >
      {/* Backdrop */}
      <div
        aria-hidden="true"
        className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs transition-opacity"
        onClick={handleClose}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-lg rounded-card border border-line-default bg-surface-default p-6 shadow-overlay animate-in fade-in zoom-in-95 duration-150">

        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-line-default pb-4">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-control bg-indigo-50 text-indigo-600">
              <Building2 className="size-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-ink-primary" id="create-workspace-title">
                Create a Workspace
              </h2>
              <p className="text-xs text-ink-muted">
                Set up a new team workspace for your organization
              </p>
            </div>
          </div>

          <button
            aria-label="Close dialog"
            className="rounded-control p-1 text-ink-muted hover:bg-surface-muted hover:text-ink-primary"
            onClick={handleClose}
            type="button"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Form Body */}
        <form className="mt-5 space-y-4" onSubmit={handleSubmit}>

          {/* Workspace Name */}
          <div>
            <Input
              autoFocus
              label="Workspace Name"
              name="workspaceName"
              placeholder="e.g. North America Enterprise Sales"
              value={workspaceName}
              onChange={(e) => setWorkspaceName(e.target.value)}
              required
            />
            <p className="mt-1 text-[11px] text-ink-muted">
              This name will appear in your team sidebar and notifications.
            </p>
          </div>

          {/* Description */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-secondary" htmlFor="ws-desc">
              Description <span className="text-xs text-ink-muted font-normal">(Optional)</span>
            </label>
            <textarea
              className="flex min-h-[72px] w-full rounded-control border border-line-strong bg-surface-default p-3 text-sm text-ink-primary focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              id="ws-desc"
              name="description"
              placeholder="e.g. Inbound pipeline, SDR outreach, and revenue forecasting."
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Contextual Role Notice */}
          <div className="flex items-start gap-2.5 rounded-control border border-indigo-100 bg-indigo-50/70 p-3 text-xs text-indigo-950">
            <Crown className="size-4 shrink-0 text-indigo-600 mt-0.5" />
            <div>
              <span className="font-semibold text-indigo-700">Manager / Owner Role Assigned:</span>
              <p className="mt-0.5 text-ink-secondary">
                As the creator, you will have full Manager privileges to invite team members, assign member roles, and configure CRM integrations.
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
            <Button onClick={handleClose} type="button" variant="outline" disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              className="bg-indigo-600 hover:bg-indigo-700"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? 'Creating Workspace…' : 'Create & Enter Workspace'}
            </Button>
          </div>

        </form>
      </div>
    </div>
  )
}
