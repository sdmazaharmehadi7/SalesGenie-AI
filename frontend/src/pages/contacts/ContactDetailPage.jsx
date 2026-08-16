import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  Users,
  Building2,
  Mail,
  Phone,
  ArrowLeft,
  RefreshCw,
  Trash2,
  Calendar,
} from '@/components/ui/icons'
import { getContact, deleteContact } from '@/services/api/contacts'
import ActivityTimeline from '@/components/common/ActivityTimeline'

export default function ContactDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [contact, setContact] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadContact = async () => {
    setLoading(true)
    try {
      const data = await getContact(id)
      setContact(data)
    } catch (err) {
      console.error('Failed to load contact details:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadContact()
  }, [id])

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this contact?')) return
    try {
      await deleteContact(id)
      navigate('/contacts')
    } catch (err) {
      console.error('Failed to delete contact:', err)
    }
  }

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <RefreshCw className="size-8 animate-spin text-brand-600" />
      </div>
    )
  }

  if (!contact) {
    return (
      <div className="p-8 text-center">
        <p className="text-sm text-ink-muted">Contact not found.</p>
        <Link to="/contacts" className="mt-2 inline-block text-xs font-semibold text-brand-600">
          &larr; Back to Contacts
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6 lg:p-8">
      {/* Back link */}
      <div>
        <Link
          to="/contacts"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-secondary hover:text-ink-primary"
        >
          <ArrowLeft className="size-3.5" />
          Back to Contacts
        </Link>
      </div>

      {/* Contact Header */}
      <div className="rounded-2xl border border-line-default bg-surface-default p-6 shadow-xs">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            <div className="grid size-12 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100 shadow-2xs">
              <Users className="size-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-ink-muted">Contact</span>
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                  Active
                </span>
              </div>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink-primary">
                {contact.first_name} {contact.last_name || ''}
              </h1>
              <p className="text-xs text-ink-secondary font-medium mt-0.5">
                {contact.job_title || 'No Title'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {contact.account_id && (
              <Link
                to={`/accounts/${contact.account_id}`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-line-default bg-surface-default px-3.5 py-2 text-xs font-semibold text-ink-primary shadow-xs hover:bg-surface-muted transition-colors"
              >
                <Building2 className="size-3.5 text-purple-600" />
                View Account
              </Link>
            )}
            <button
              type="button"
              onClick={handleDelete}
              className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
            >
              <Trash2 className="size-3.5" />
              Delete
            </button>
          </div>
        </div>

        {/* Contact Info Row */}
        <div className="mt-6 border-t border-line-default pt-5">
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3 text-xs">
            <div className="flex items-center gap-2.5">
              <Mail className="size-4 text-ink-muted shrink-0" />
              <div>
                <dt className="text-[11px] text-ink-muted font-medium">Email Address</dt>
                <dd className="font-semibold text-ink-primary">{contact.email || '—'}</dd>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <Phone className="size-4 text-ink-muted shrink-0" />
              <div>
                <dt className="text-[11px] text-ink-muted font-medium">Phone Number</dt>
                <dd className="font-semibold text-ink-primary">{contact.phone || '—'}</dd>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <Calendar className="size-4 text-ink-muted shrink-0" />
              <div>
                <dt className="text-[11px] text-ink-muted font-medium">Created On</dt>
                <dd className="font-semibold text-ink-primary">
                  {new Date(contact.created_at).toLocaleDateString()}
                </dd>
              </div>
            </div>
          </dl>
        </div>
      </div>

      {/* Activity Timeline */}
      <ActivityTimeline contactId={contact.id} />
    </div>
  )
}
