import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  Building2,
  Users,
  Briefcase,
  Sparkles,
  ArrowLeft,
  RefreshCw,
  Plus,
  ArrowUpRight,
  Pencil,
  Trash2,
  Phone,
  DollarSign,
} from '@/components/ui/icons'
import {
  getAccount,
  getAccountContacts,
  getAccountOpportunities,
  generateAccountInsights,
  deleteAccount,
} from '@/services/api/accounts'
import ActivityTimeline from '@/components/common/ActivityTimeline'

export default function AccountDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [account, setAccount] = useState(null)
  const [contacts, setContacts] = useState([])
  const [opportunities, setOpportunities] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [generatingAi, setGeneratingAi] = useState(false)
  const [aiInsight, setAiInsight] = useState(null)

  const loadAll = async () => {
    setLoading(true)
    try {
      const accData = await getAccount(id)
      setAccount(accData)

      const [conData, oppData] = await Promise.all([
        getAccountContacts(id).catch(() => []),
        getAccountOpportunities(id).catch(() => []),
      ])
      setContacts(conData || [])
      setOpportunities(oppData || [])
    } catch (err) {
      console.error('Failed to load account details:', err)
      setAccount(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAll()
  }, [id])

  const handleGenerateAI = async () => {
    setGeneratingAi(true)
    try {
      const res = await generateAccountInsights(id)
      setAiInsight(res.data)
    } catch (err) {
      console.error('Failed to generate AI insights:', err)
    } finally {
      setGeneratingAi(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to permanently delete this account?')) return
    try {
      await deleteAccount(id)
      navigate('/accounts')
    } catch (err) {
      console.error('Failed to delete account:', err)
    }
  }

  const formatCurrency = (val) => {
    const num = Number(val) || 0
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(num)
  }

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <RefreshCw className="size-8 animate-spin text-brand-600" />
      </div>
    )
  }

  if (!account) {
    return (
      <div className="p-8 text-center">
        <p className="text-sm text-ink-muted">Account not found.</p>
        <Link to="/accounts" className="mt-2 inline-block text-xs font-semibold text-brand-600">
          &larr; Back to Accounts
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6 lg:p-8">
      {/* Back button */}
      <div>
        <Link
          to="/accounts"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-secondary hover:text-ink-primary"
        >
          <ArrowLeft className="size-3.5" />
          Back to Accounts
        </Link>
      </div>

      {/* Account Header Banner */}
      <div className="rounded-2xl border border-line-default bg-surface-default p-6 shadow-xs">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            <div className="grid size-12 shrink-0 place-items-center rounded-xl bg-purple-50 text-purple-600 border border-purple-100 shadow-2xs">
              <Building2 className="size-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-ink-muted">Account</span>
                <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[11px] font-semibold text-ink-secondary">
                  {account.company_size || 'Company'}
                </span>
              </div>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink-primary">{account.name}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-ink-secondary">
                {account.industry && <span>Industry: <strong className="text-ink-primary">{account.industry}</strong></span>}
                {account.phone && <span>Phone: <strong className="text-ink-primary">{account.phone}</strong></span>}
                {account.website && (
                  <a
                    href={account.website.startsWith('http') ? account.website : `https://${account.website}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-brand-600 hover:underline"
                  >
                    {account.website}
                    <ArrowUpRight className="size-3" />
                  </a>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleGenerateAI}
              disabled={generatingAi}
              className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 transition-all"
            >
              <Sparkles className={`size-3.5 ${generatingAi ? 'animate-spin' : ''}`} />
              {generatingAi ? 'Analyzing Company...' : 'Generate AI Insights'}
            </button>
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
      </div>

      {/* Tabs */}
      <div className="flex border-b border-line-default">
        {[
          { key: 'overview', label: 'Overview & AI Insights', icon: Sparkles },
          { key: 'contacts', label: `Contacts (${contacts.length})`, icon: Users },
          { key: 'opportunities', label: `Opportunities (${opportunities.length})`, icon: Briefcase },
          { key: 'activities', label: 'Activity Timeline', icon: Phone },
        ].map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 border-b-2 px-5 py-3 text-xs font-semibold transition-colors ${
                activeTab === tab.key
                  ? 'border-brand-600 text-brand-600'
                  : 'border-transparent text-ink-secondary hover:border-line-default hover:text-ink-primary'
              }`}
            >
              <Icon className="size-3.5" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Tab Contents */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* AI Intelligence Card */}
          {aiInsight && (
            <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/50 to-purple-50/40 p-6 shadow-xs">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="size-5 text-indigo-600" />
                <h3 className="text-sm font-bold text-indigo-950">Gemini Company Intelligence & Strategic Insights</h3>
              </div>
              <p className="text-xs text-indigo-900 leading-relaxed">{aiInsight.executive_summary}</p>

              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-xl bg-surface-default/80 p-4 border border-indigo-100">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-900">Key Business Needs</h4>
                  <ul className="mt-2 space-y-1.5">
                    {aiInsight.business_needs?.map((need, i) => (
                      <li key={i} className="flex items-center gap-2 text-xs text-ink-primary">
                        <span className="size-1.5 rounded-full bg-indigo-500" />
                        {need}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-xl bg-surface-default/80 p-4 border border-indigo-100">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-900">Sales Opportunities</h4>
                  <ul className="mt-2 space-y-1.5">
                    {aiInsight.sales_opportunities?.map((opp, i) => (
                      <li key={i} className="flex items-center gap-2 text-xs text-ink-primary">
                        <span className="size-1.5 rounded-full bg-emerald-500" />
                        {opp}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Company Info Card */}
          <div className="rounded-2xl border border-line-default bg-surface-default p-6 shadow-xs">
            <h3 className="text-base font-bold text-ink-primary mb-4">Account Information</h3>
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 text-xs">
              <div>
                <dt className="font-semibold text-ink-muted">Company Name</dt>
                <dd className="mt-1 font-medium text-ink-primary">{account.name}</dd>
              </div>
              <div>
                <dt className="font-semibold text-ink-muted">Industry</dt>
                <dd className="mt-1 font-medium text-ink-primary">{account.industry || '—'}</dd>
              </div>
              <div>
                <dt className="font-semibold text-ink-muted">Company Size</dt>
                <dd className="mt-1 font-medium text-ink-primary">{account.company_size || '—'}</dd>
              </div>
              <div>
                <dt className="font-semibold text-ink-muted">Website</dt>
                <dd className="mt-1 font-medium text-brand-600">{account.website || '—'}</dd>
              </div>
              <div>
                <dt className="font-semibold text-ink-muted">Phone</dt>
                <dd className="mt-1 font-medium text-ink-primary">{account.phone || '—'}</dd>
              </div>
              <div>
                <dt className="font-semibold text-ink-muted">Address</dt>
                <dd className="mt-1 font-medium text-ink-primary">{account.address || '—'}</dd>
              </div>
            </dl>
            {account.description && (
              <div className="mt-6 border-t border-line-default pt-4">
                <dt className="font-semibold text-ink-muted text-xs">About / Description</dt>
                <dd className="mt-1 text-xs text-ink-secondary leading-relaxed">{account.description}</dd>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'contacts' && (
        <div className="rounded-2xl border border-line-default bg-surface-default p-6 shadow-xs">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-bold text-ink-primary">Associated Contacts</h3>
            <Link
              to="/contacts"
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700"
            >
              <Plus className="size-3.5" />
              Add Contact
            </Link>
          </div>

          {contacts.length === 0 ? (
            <p className="py-8 text-center text-xs text-ink-muted">No contacts linked to this account yet.</p>
          ) : (
            <div className="divide-y divide-line-default">
              {contacts.map((c) => (
                <div key={c.id} className="flex items-center justify-between py-3">
                  <div>
                    <Link to={`/contacts/${c.id}`} className="text-xs font-semibold text-brand-600 hover:underline">
                      {c.first_name} {c.last_name || ''}
                    </Link>
                    <p className="text-[11px] text-ink-muted">{c.job_title || 'Contact'} &bull; {c.email || 'No email'}</p>
                  </div>
                  <Link
                    to={`/contacts/${c.id}`}
                    className="rounded-md border border-line-default px-2.5 py-1 text-xs font-semibold text-ink-secondary hover:bg-surface-muted"
                  >
                    View
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'opportunities' && (
        <div className="rounded-2xl border border-line-default bg-surface-default p-6 shadow-xs">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-bold text-ink-primary">Related Opportunities & Deals</h3>
            <Link
              to="/opportunities"
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700"
            >
              <Plus className="size-3.5" />
              New Deal
            </Link>
          </div>

          {opportunities.length === 0 ? (
            <p className="py-8 text-center text-xs text-ink-muted">No deals currently linked to this account.</p>
          ) : (
            <div className="divide-y divide-line-default">
              {opportunities.map((opp) => (
                <div key={opp.id} className="flex items-center justify-between py-3.5">
                  <div>
                    <Link to={`/opportunities/${opp.id}`} className="text-xs font-bold text-brand-600 hover:underline">
                      {opp.name}
                    </Link>
                    <p className="text-[11px] text-ink-muted capitalize">Stage: {opp.stage} &bull; {opp.probability || 20}% probability</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-ink-primary">{formatCurrency(opp.amount)}</p>
                    <Link
                      to={`/opportunities/${opp.id}`}
                      className="text-[11px] font-semibold text-brand-600 hover:underline"
                    >
                      View Details &rarr;
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'activities' && (
        <ActivityTimeline accountId={account.id} />
      )}
    </div>
  )
}
