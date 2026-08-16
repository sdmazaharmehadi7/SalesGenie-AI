import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Building2,
  Plus,
  Search,
  RefreshCw,
  X,
  Sparkles,
  ArrowUpRight,
} from '@/components/ui/icons'
import { getAccounts, createAccount } from '@/services/api/accounts'

export default function AccountsPage() {
  const [accounts, setAccounts] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    industry: '',
    website: '',
    company_size: '11-50',
    phone: '',
    address: '',
    description: '',
  })

  const loadAccounts = async () => {
    setLoading(true)
    try {
      const data = await getAccounts({ page, page_size: 20, search })
      setAccounts(data.items || [])
      setTotal(data.total || 0)
    } catch (err) {
      console.error('Failed to load accounts:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAccounts()
  }, [page, search])

  const handleCreate = async (e) => {
    e.preventDefault()
    try {
      await createAccount(formData)
      setShowCreateModal(false)
      setFormData({
        name: '',
        industry: '',
        website: '',
        company_size: '11-50',
        phone: '',
        address: '',
        description: '',
      })
      await loadAccounts()
    } catch (err) {
      console.error('Failed to create account:', err)
    }
  }

  return (
    <div className="space-y-6 p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2.5 py-0.5 text-xs font-semibold text-purple-700">
              <Building2 className="size-3.5" />
              Accounts
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink-primary">
            Accounts & Companies
          </h1>
          <p className="text-xs text-ink-secondary">
            Verified company profiles, related contacts, opportunities, and full activity history.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-brand-700 transition-colors"
          >
            <Plus className="size-3.5" />
            New Account
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-3 rounded-xl border border-line-default bg-surface-default p-3 shadow-xs">
        <Search className="size-4 text-ink-muted ml-2" />
        <input
          type="text"
          placeholder="Search accounts by company name, industry..."
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

      {/* Accounts Table */}
      <div className="overflow-hidden rounded-xl border border-line-default bg-surface-default shadow-xs">
        {loading ? (
          <div className="flex justify-center py-16">
            <RefreshCw className="size-6 animate-spin text-brand-600" />
          </div>
        ) : accounts.length === 0 ? (
          <div className="py-16 text-center text-xs text-ink-muted">
            No accounts found. Click "New Account" to create your first company profile.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-line-default bg-surface-subtle font-semibold uppercase tracking-wider text-ink-muted">
                <tr>
                  <th className="px-5 py-3.5">Company Name</th>
                  <th className="px-5 py-3.5">Industry</th>
                  <th className="px-5 py-3.5">Company Size</th>
                  <th className="px-5 py-3.5">Website</th>
                  <th className="px-5 py-3.5">Phone</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-default text-ink-primary">
                {accounts.map((acc) => (
                  <tr key={acc.id} className="hover:bg-surface-subtle transition-colors">
                    <td className="px-5 py-3.5 font-semibold text-brand-600">
                      <Link to={`/accounts/${acc.id}`} className="hover:underline flex items-center gap-1.5">
                        <Building2 className="size-3.5 text-ink-muted" />
                        {acc.name}
                      </Link>
                    </td>
                    <td className="px-5 py-3.5 text-ink-secondary">{acc.industry || '—'}</td>
                    <td className="px-5 py-3.5">
                      <span className="rounded-full bg-surface-muted px-2 py-0.5 font-medium text-ink-secondary">
                        {acc.company_size || '—'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-ink-secondary">
                      {acc.website ? (
                        <a
                          href={acc.website.startsWith('http') ? acc.website : `https://${acc.website}`}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:text-brand-600 flex items-center gap-1"
                        >
                          {acc.website}
                          <ArrowUpRight className="size-3" />
                        </a>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-ink-secondary">{acc.phone || '—'}</td>
                    <td className="px-5 py-3.5 text-right">
                      <Link
                        to={`/accounts/${acc.id}`}
                        className="rounded-md border border-line-default px-2.5 py-1 text-xs font-semibold text-brand-600 hover:bg-brand-50"
                      >
                        View Account
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Account Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-line-default bg-surface-default p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-bold text-ink-primary">Create New Account</h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-ink-muted hover:text-ink-primary"
              >
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-ink-secondary">Company Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Acme Corporation"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-line-default px-3 py-2 text-xs text-ink-primary focus:border-brand-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-ink-secondary">Industry</label>
                  <input
                    type="text"
                    placeholder="e.g. SaaS / FinTech"
                    value={formData.industry}
                    onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-line-default px-3 py-2 text-xs text-ink-primary focus:border-brand-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink-secondary">Company Size</label>
                  <select
                    value={formData.company_size}
                    onChange={(e) => setFormData({ ...formData, company_size: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-line-default px-3 py-2 text-xs text-ink-primary focus:border-brand-500 focus:outline-none"
                  >
                    <option value="1-10">1-10 employees</option>
                    <option value="11-50">11-50 employees</option>
                    <option value="51-200">51-200 employees</option>
                    <option value="201-500">201-500 employees</option>
                    <option value="500+">500+ employees</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-ink-secondary">Website</label>
                  <input
                    type="text"
                    placeholder="https://acme.com"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-line-default px-3 py-2 text-xs text-ink-primary focus:border-brand-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink-secondary">Phone</label>
                  <input
                    type="text"
                    placeholder="+1 (555) 000-0000"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-line-default px-3 py-2 text-xs text-ink-primary focus:border-brand-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-secondary">Description / Background</label>
                <textarea
                  rows={3}
                  placeholder="Overview of company business model, target market, etc..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-line-default px-3 py-2 text-xs text-ink-primary focus:border-brand-500 focus:outline-none"
                />
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
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
