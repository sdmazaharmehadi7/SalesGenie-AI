import {
  createLead,
  getLeads,
  updateLead,
  deleteLead as deleteLeadAPI,
} from "@/services/api/leads";
import { useEffect, useMemo, useState } from 'react'

import Button from '@/components/ui/Button'
import DataTable from '@/components/ui/DataTable'
import Pagination from '@/components/ui/Pagination'
import StatusBadge from '@/components/ui/StatusBadge'
import { Plus, Pencil, Search, SlidersHorizontal, Trash2, X } from '@/components/ui/icons'
import { STATUS_LABELS } from '@/features/intelligence/utils/leadMapper'

// Mirrors the backend's `LeadStatus` enum (app/models/pipeline_enums.py) so
// filters/selects only ever send values the API accepts.
const LEAD_STATUSES = ['new', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost']

const statusFilterOptions = ['All statuses', ...LEAD_STATUSES]
const pageSize = 5

function extractErrorMessage(error, fallback) {
  const detail = error?.response?.data?.detail
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail) && detail.length > 0) {
    return detail.map((item) => item.msg || item.message).filter(Boolean).join(' ') || fallback
  }
  return error?.response?.data?.error?.message || error?.message || fallback
}

function LeadFormFields({ lead }) {
  return (
    <div className="grid gap-4 p-5 sm:grid-cols-2">
      <label className="space-y-1.5">
        <span>Company Name</span>
        <input className="input" name="company_name" defaultValue={lead?.company_name} required />
      </label>

      <label className="space-y-1.5">
        <span>Industry</span>
        <input className="input" name="industry" defaultValue={lead?.industry ?? ''} />
      </label>

      <label className="space-y-1.5">
        <span>Contact Name</span>
        <input className="input" name="contact_name" defaultValue={lead?.contact_name ?? ''} />
      </label>

      <label className="space-y-1.5">
        <span>Email</span>
        <input className="input" type="email" name="email" defaultValue={lead?.email ?? ''} />
      </label>

      <label className="space-y-1.5">
        <span>Phone</span>
        <input className="input" name="phone" defaultValue={lead?.phone ?? ''} />
      </label>

      <label className="space-y-1.5">
        <span>Deal Value</span>
        <input className="input" type="number" min="0" step="0.01" name="deal_value" defaultValue={lead?.deal_value ?? ''} />
      </label>

      <label className="space-y-1.5 sm:col-span-2">
        <span>Status</span>
        <select className="input" name="lead_status" defaultValue={lead?.lead_status ?? 'new'}>
          {LEAD_STATUSES.map((status) => (
            <option key={status} value={status}>{STATUS_LABELS[status] || status}</option>
          ))}
        </select>
      </label>
    </div>
  )
}

function AddLeadModal({ open, onClose, onSave, isSaving, error }) {
  if (!open) return null

  function handleSubmit(event) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const dealValue = formData.get('deal_value')

    onSave({
      company_name: formData.get('company_name'),
      industry: formData.get('industry') || null,
      contact_name: formData.get('contact_name') || null,
      email: formData.get('email') || null,
      phone: formData.get('phone') || null,
      deal_value: dealValue ? Number(dealValue) : null,
      lead_status: formData.get('lead_status'),
    })
  }

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-slate-950/30 p-4">
      <div aria-label="Add lead" className="w-full max-w-lg rounded-card bg-surface-default shadow-overlay" role="dialog">
        <div className="flex items-center justify-between border-b border-line-default p-5">
          <h2 className="text-base font-semibold text-ink-primary">Add lead</h2>
          <button aria-label="Close add lead" className="rounded-control p-1.5 text-ink-muted hover:bg-surface-muted" onClick={onClose} type="button"><X className="size-5" /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <LeadFormFields lead={null} />
          {error ? <p className="px-5 pb-2 text-sm text-danger">{error}</p> : null}
          <div className="flex justify-end gap-3 border-t border-line-default p-5">
            <Button onClick={onClose} type="button" variant="secondary" disabled={isSaving}>Cancel</Button>
            <Button type="submit" disabled={isSaving}>{isSaving ? 'Creating…' : 'Create lead'}</Button>
          </div>
        </form>
      </div>
    </div>
  )
}

function EditLeadModal({ lead, onClose, onSave, isSaving, error }) {
  if (!lead) return null

  function handleSubmit(event) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const dealValue = formData.get('deal_value')

    onSave({
      ...lead,
      company_name: formData.get('company_name'),
      industry: formData.get('industry') || null,
      contact_name: formData.get('contact_name') || null,
      email: formData.get('email') || null,
      phone: formData.get('phone') || null,
      deal_value: dealValue ? Number(dealValue) : null,
      lead_status: formData.get('lead_status'),
    })
  }

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-slate-950/30 p-4">
      <div aria-label="Edit lead" className="w-full max-w-lg rounded-card bg-surface-default shadow-overlay" role="dialog">
        <div className="flex items-center justify-between border-b border-line-default p-5"><h2 className="text-base font-semibold text-ink-primary">Edit lead</h2><button aria-label="Close edit lead" className="rounded-control p-1.5 text-ink-muted hover:bg-surface-muted" onClick={onClose} type="button"><X className="size-5" /></button></div>
        <form onSubmit={handleSubmit}>
          <LeadFormFields lead={lead} />
          {error ? <p className="px-5 pb-2 text-sm text-danger">{error}</p> : null}
          <div className="flex justify-end gap-3 border-t border-line-default p-5"><Button onClick={onClose} type="button" variant="secondary" disabled={isSaving}>Cancel</Button><Button type="submit" disabled={isSaving}>{isSaving ? 'Saving…' : 'Save changes'}</Button></div>
        </form>
      </div>
    </div>
  )
}

function DeleteLeadDialog({ lead, onCancel, onConfirm, isDeleting, error }) {
  if (!lead) return null

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/30 p-4">
      <div aria-label="Delete lead" className="w-full max-w-sm rounded-card bg-surface-default p-6 shadow-overlay" role="dialog">
        <h2 className="text-base font-semibold text-ink-primary">Delete {lead.company_name}?</h2>
        <p className="mt-2 text-sm leading-6 text-ink-muted">This will permanently remove the lead. This action cannot be undone.</p>
        {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
        <div className="mt-6 flex justify-end gap-3"><Button onClick={onCancel} variant="secondary" disabled={isDeleting}>Cancel</Button><Button onClick={() => onConfirm(lead.id)} variant="danger" disabled={isDeleting}>{isDeleting ? 'Deleting…' : 'Delete lead'}</Button></div>
      </div>
    </div>
  )
}

function LeadsPage() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('All statuses')
  const [page, setPage] = useState(1)

  const [isAdding, setIsAdding] = useState(false)
  const [addError, setAddError] = useState(null)
  const [showAddModal, setShowAddModal] = useState(false)

  const [editingLead, setEditingLead] = useState(null)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)

  const [leadToDelete, setLeadToDelete] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState(null)

  const [notice, setNotice] = useState(null)

  const showNotice = (type, message) => {
    setNotice({ type, message })
    setTimeout(() => setNotice(null), 3500)
  }

  const filteredLeads = useMemo(() => {
    const searchTerm = query.trim().toLowerCase()
    return leads.filter((lead) => {
      const searchValue = `${lead.company_name || ''} ${lead.industry || ''} ${lead.contact_name || ''} ${lead.email || ''}`.toLowerCase();

      return (
        (!searchTerm || searchValue.includes(searchTerm)) &&
        (status === "All statuses" || lead.lead_status === status)
      );
    });
  }, [leads, query, status]);

  const totalPages = Math.max(1, Math.ceil(filteredLeads.length / pageSize))
  const pageLeads = filteredLeads.slice((page - 1) * pageSize, page * pageSize)

  useEffect(() => setPage(1), [query, status])
  useEffect(() => { if (page > totalPages) setPage(totalPages) }, [page, totalPages])

  const loadLeads = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await getLeads();
      setLeads(data.items || []);
    } catch (error) {
      console.error("Leads Error:", error);
      setLoadError(extractErrorMessage(error, 'Failed to load leads. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLeads();
  }, []);

  function clearFilters() {
    setQuery('')
    setStatus('All statuses')
  }

  const addLead = async (newLead) => {
    setIsAdding(true)
    setAddError(null)
    try {
      await createLead(newLead);
      await loadLeads();
      setShowAddModal(false);
      showNotice('success', 'Lead created successfully.')
    } catch (error) {
      console.error("Create Error:", error);
      setAddError(extractErrorMessage(error, 'Failed to create lead.'));
    } finally {
      setIsAdding(false)
    }
  };

  const saveLead = async (updatedLead) => {
    setIsSaving(true)
    setSaveError(null)
    try {
      await updateLead(updatedLead.id, updatedLead);
      await loadLeads();
      setEditingLead(null);
      showNotice('success', 'Lead updated successfully.')
    } catch (error) {
      console.error("Update Error:", error);
      setSaveError(extractErrorMessage(error, 'Failed to update lead.'));
    } finally {
      setIsSaving(false)
    }
  };

  const deleteLead = async (id) => {
    setIsDeleting(true)
    setDeleteError(null)
    try {
      await deleteLeadAPI(id);
      await loadLeads();
      setLeadToDelete(null);
      showNotice('success', 'Lead deleted successfully.')
    } catch (error) {
      console.error(error);
      setDeleteError(extractErrorMessage(error, 'Failed to delete lead.'));
    } finally {
      setIsDeleting(false)
    }
  };

  const columns = [
    {
      key: "company",
      header: "Company",
      render: (lead) => (
        <div>
          <span className="block font-medium text-ink-primary">{lead.company_name}</span>
          {lead.contact_name ? <span className="block text-xs text-ink-muted">{lead.contact_name}</span> : null}
        </div>
      ),
    },
    {
      key: "industry",
      header: "Industry",
      render: (lead) => (
        <span>{lead.industry || '—'}</span>
      ),
    },
    {
      key: "deal_value",
      header: "Deal Value",
      render: (lead) => (
        <span>{lead.deal_value != null ? `$${Number(lead.deal_value).toLocaleString()}` : '—'}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (lead) => (
        <StatusBadge status={STATUS_LABELS[lead.lead_status] || lead.lead_status} />
      ),
    },
    {
      key: "updated",
      header: "Updated",
      render: (lead) => (
        <span>
          {lead.updated_at ? new Date(lead.updated_at).toLocaleDateString() : '—'}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (lead) => (
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={() => { setSaveError(null); setEditingLead(lead) }}
          >
            <Pencil className="size-4" />
          </Button>

          <Button
            variant="danger"
            onClick={() => { setDeleteError(null); setLeadToDelete(lead) }}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {notice ? (
        <div className={`fixed bottom-5 right-5 z-50 rounded-card px-4 py-2.5 text-sm font-medium shadow-floating ${notice.type === 'success' ? 'bg-surface-inverse text-ink-inverse' : 'bg-rose-600 text-white'}`}>
          {notice.message}
        </div>
      ) : null}

      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-sm font-medium text-brand-600">Workspace</p><h1 className="mt-1 text-3xl font-semibold tracking-tight text-ink-primary">Leads</h1><p className="mt-2 text-sm text-ink-muted">Manage and qualify your prospect pipeline.</p></div>
        <Button leftIcon={<Plus className="size-4" />} onClick={() => { setAddError(null); setShowAddModal(true) }}>Add lead</Button>
      </header>

      {loadError ? (
        <div className="card flex items-center gap-3 border border-rose-200 bg-rose-50 p-4 text-rose-800">
          <div className="flex-1 text-sm">
            <p className="font-semibold">Couldn't load leads</p>
            <p className="text-rose-700/90">{loadError}</p>
          </div>
          <Button onClick={loadLeads} variant="secondary">Try again</Button>
        </div>
      ) : null}

      <section className="card overflow-hidden p-0">
        <div className="flex flex-col gap-3 border-b border-line-default p-4 lg:flex-row lg:items-center">
          <div className="relative flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted" /><input className="input pl-9" onChange={(event) => setQuery(event.target.value)} placeholder="Search by name, email, or company" value={query} /></div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <label className="relative"><SlidersHorizontal className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted" /><select aria-label="Filter by status" className="input min-w-40 pl-9" onChange={(event) => setStatus(event.target.value)} value={status}>{statusFilterOptions.map((option) => <option key={option} value={option}>{option === 'All statuses' ? option : (STATUS_LABELS[option] || option)}</option>)}</select></label>

            {(query || status !== 'All statuses') ? <Button onClick={clearFilters} variant="ghost">Clear</Button> : null}
          </div>
        </div>
        {loading ? (
          <div className="p-10 text-center text-sm text-ink-muted">Loading leads…</div>
        ) : (
          <>
            <DataTable
              columns={columns}
              data={pageLeads}
              getRowId={(lead) => lead.id}
              emptyMessage={leads.length === 0 ? 'No leads yet. Add your first lead to get started.' : 'No leads match your search or filters.'}
            />
            <Pagination currentPage={page} onPageChange={setPage} pageSize={pageSize} totalItems={filteredLeads.length} />
          </>
        )}
      </section>

      <AddLeadModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSave={addLead}
        isSaving={isAdding}
        error={addError}
      />

      <EditLeadModal
        lead={editingLead}
        onClose={() => setEditingLead(null)}
        onSave={saveLead}
        isSaving={isSaving}
        error={saveError}
      />

      <DeleteLeadDialog
        lead={leadToDelete}
        onCancel={() => setLeadToDelete(null)}
        onConfirm={deleteLead}
        isDeleting={isDeleting}
        error={deleteError}
      />
    </div>

  )
}

export default LeadsPage
