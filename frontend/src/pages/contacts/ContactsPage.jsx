import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Users,
  Plus,
  Search,
  RefreshCw,
  X,
  Mail,
  Phone,
  Building2,
} from '@/components/ui/icons'
import { getContacts, createContact } from '@/services/api/contacts'
import { getAccounts } from '@/services/api/accounts'
import { useWorkspaceKey } from '@/hooks/useWorkspaceKey'

export default function ContactsPage() {
  const { workspaceKey } = useWorkspaceKey()
  const [contacts, setContacts] = useState([])
  const [accounts, setAccounts] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    job_title: '',
    account_id: '',
  })

  const loadContacts = async () => {
    setLoading(true)
    try {
      const [conData, accData] = await Promise.all([
        getContacts({ page, page_size: 20, search }),
        getAccounts({ page_size: 100 }).catch(() => ({ items: [] })),
      ])
      setContacts(conData.items || [])
      setTotal(conData.total || 0)
      setAccounts(accData.items || [])
    } catch (err) {
      console.error('Failed to load contacts:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadContacts()
  }, [page, search, workspaceKey])

  const handleCreate = async (e) => {
    e.preventDefault()
    try {
      await createContact({
        ...formData,
        account_id: formData.account_id || undefined,
      })
      setShowCreateModal(false)
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        job_title: '',
        account_id: '',
      })
      await loadContacts()
    } catch (err) {
      console.error('Failed to create contact:', err)
    }
  }

  return (
    <div className="space-y-6 p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
              <Users className="size-3.5" />
              Contacts
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink-primary">
            Contacts & People
          </h1>
          <p className="text-xs text-ink-secondary">
            Manage individual decision-makers, champions, and account relationships.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-brand-700 transition-colors"
          >
            <Plus className="size-3.5" />
            New Contact
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-3 rounded-xl border border-line-default bg-surface-default p-3 shadow-xs">
        <Search className="size-4 text-ink-muted ml-2" />
        <input
          type="text"
          placeholder="Search contacts by name, title, email..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
          className="w-full bg-transparent text-xs text-ink-primary placeholder:text-ink-muted focus:outline-none"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch('')}
            className="text-xs text-ink-muted hover:text-ink-primary mr-2"
          >
            Clear
          </button>
        )}
      </div>

      {/* Contacts Table */}
      <div className="overflow-hidden rounded-xl border border-line-default bg-surface-default shadow-xs">
        {loading ? (
          <div className="flex justify-center py-16">
            <RefreshCw className="size-6 animate-spin text-brand-600" />
          </div>
        ) : contacts.length === 0 ? (
          <div className="py-16 text-center text-xs text-ink-muted">
            No contacts found. Click "New Contact" to add your first customer touchpoint.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-line-default bg-surface-subtle font-semibold uppercase tracking-wider text-ink-muted">
                <tr>
                  <th className="px-5 py-3.5">Name</th>
                  <th className="px-5 py-3.5">Job Title</th>
                  <th className="px-5 py-3.5">Email</th>
                  <th className="px-5 py-3.5">Phone</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-default text-ink-primary">
                {contacts.map((c) => (
                  <tr key={c.id} className="hover:bg-surface-subtle transition-colors">
                    <td className="px-5 py-3.5 font-semibold text-brand-600">
                      <Link to={`/contacts/${c.id}`} className="hover:underline flex items-center gap-1.5">
                        <Users className="size-3.5 text-ink-muted" />
                        {c.first_name} {c.last_name || ''}
                      </Link>
                    </td>
                    <td className="px-5 py-3.5 text-ink-secondary">{c.job_title || '—'}</td>
                    <td className="px-5 py-3.5 text-ink-secondary">{c.email || '—'}</td>
                    <td className="px-5 py-3.5 text-ink-secondary">{c.phone || '—'}</td>
                    <td className="px-5 py-3.5 text-right">
                      <Link
                        to={`/contacts/${c.id}`}
                        className="rounded-md border border-line-default px-2.5 py-1 text-xs font-semibold text-brand-600 hover:bg-brand-50"
                      >
                        View Profile
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Contact Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-line-default bg-surface-default p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-bold text-ink-primary">Create New Contact</h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-ink-muted hover:text-ink-primary"
              >
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-ink-secondary">First Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Jane"
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-line-default px-3 py-2 text-xs text-ink-primary focus:border-brand-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink-secondary">Last Name</label>
                  <input
                    type="text"
                    placeholder="Doe"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-line-default px-3 py-2 text-xs text-ink-primary focus:border-brand-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-ink-secondary">Email</label>
                  <input
                    type="email"
                    placeholder="jane@company.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-line-default px-3 py-2 text-xs text-ink-primary focus:border-brand-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink-secondary">Phone</label>
                  <input
                    type="text"
                    placeholder="+1 (555) 123-4567"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-line-default px-3 py-2 text-xs text-ink-primary focus:border-brand-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-ink-secondary">Job Title</label>
                  <input
                    type="text"
                    placeholder="VP of Engineering"
                    value={formData.job_title}
                    onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-line-default px-3 py-2 text-xs text-ink-primary focus:border-brand-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink-secondary">Account / Company</label>
                  <select
                    value={formData.account_id}
                    onChange={(e) => setFormData({ ...formData, account_id: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-line-default px-3 py-2 text-xs text-ink-primary focus:border-brand-500 focus:outline-none"
                  >
                    <option value="">No Account (Independent)</option>
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-lg border border-line-default px-4 py-2 text-xs font-medium text-ink-secondary hover:bg-surface-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-brand-600 px-5 py-2 text-xs font-semibold text-white hover:bg-brand-700 shadow-xs"
                >
                  Create Contact
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
