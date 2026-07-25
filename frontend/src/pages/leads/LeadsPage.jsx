import { useEffect, useMemo, useState } from 'react'

import Button from '@/components/ui/Button'
import DataTable from '@/components/ui/DataTable'
import Pagination from '@/components/ui/Pagination'
import StatusBadge from '@/components/ui/StatusBadge'
import { Eye, Pencil, Search, SlidersHorizontal, Trash2, X } from '@/components/ui/icons'

const initialLeads = [
  { id: 1, name: 'Maya Chen', email: 'maya@northstarlabs.com', company: 'Northstar Labs', status: 'Qualified', score: 84, owner: 'S. Mehta', updated: '12 min ago', source: 'Product demo', phone: '+1 415 555 0142' },
  { id: 2, name: 'James Wilson', email: 'james@orbit.co', company: 'Orbit Systems', status: 'Contacted', score: 72, owner: 'A. Rao', updated: '45 min ago', source: 'Referral', phone: '+1 646 555 0188' },
  { id: 3, name: 'Olivia Martin', email: 'olivia@pine.co', company: 'Pine & Co.', status: 'New', score: 68, owner: 'S. Mehta', updated: '2 hr ago', source: 'Website', phone: '+1 212 555 0129' },
  { id: 4, name: 'Ethan Brown', email: 'ethan@meridian.io', company: 'Meridian Group', status: 'Nurturing', score: 61, owner: 'L. Kim', updated: 'Yesterday', source: 'Webinar', phone: '+1 312 555 0190' },
  { id: 5, name: 'Sophia Patel', email: 'sophia@acme.com', company: 'Acme Technologies', status: 'Qualified', score: 88, owner: 'A. Rao', updated: 'Yesterday', source: 'Outbound', phone: '+1 206 555 0173' },
  { id: 6, name: 'Daniel Kim', email: 'daniel@vertex.ai', company: 'Vertex AI', status: 'Contacted', score: 75, owner: 'L. Kim', updated: 'Jul 22', source: 'Product demo', phone: '+1 408 555 0120' },
  { id: 7, name: 'Ava Thompson', email: 'ava@lumen.com', company: 'Lumen Partners', status: 'New', score: 56, owner: 'S. Mehta', updated: 'Jul 22', source: 'Website', phone: '+1 718 555 0108' },
  { id: 8, name: 'Noah Garcia', email: 'noah@ember.co', company: 'Ember Collective', status: 'Nurturing', score: 63, owner: 'A. Rao', updated: 'Jul 21', source: 'Referral', phone: '+1 917 555 0163' },
]

const statusOptions = ['All statuses', 'New', 'Contacted', 'Qualified', 'Nurturing']
const ownerOptions = ['All owners', 'S. Mehta', 'A. Rao', 'L. Kim']
const pageSize = 5

function LeadDetails({ lead, onClose, onEdit }) {
  if (!lead) return null

  const fields = [
    ['Company', lead.company],
    ['Email', lead.email],
    ['Phone', lead.phone],
    ['Source', lead.source],
    ['Owner', lead.owner],
  ]

  return (
    <div className="fixed inset-0 z-50">
      <button aria-label="Close lead details" className="absolute inset-0 bg-slate-950/30" onClick={onClose} type="button" />
      <aside aria-label="Lead details" className="absolute right-0 flex h-full w-full max-w-md flex-col bg-surface-default shadow-overlay" role="dialog">
        <div className="flex items-center justify-between border-b border-line-default p-5">
          <p className="text-base font-semibold text-ink-primary">Lead details</p>
          <button aria-label="Close lead details" className="rounded-control p-1.5 text-ink-muted hover:bg-surface-muted" onClick={onClose} type="button"><X className="size-5" /></button>
        </div>
        <div className="flex-1 p-5">
          <div className="flex items-start justify-between gap-4">
            <div><h2 className="text-xl font-semibold text-ink-primary">{lead.name}</h2><p className="mt-1 text-sm text-ink-muted">Lead score: {lead.score}</p></div>
            <StatusBadge status={lead.status} />
          </div>
          <dl className="mt-8 divide-y divide-line-default border-y border-line-default">
            {fields.map(([label, value]) => <div className="flex justify-between gap-4 py-3" key={label}><dt className="text-sm text-ink-muted">{label}</dt><dd className="text-right text-sm font-medium text-ink-primary">{value}</dd></div>)}
          </dl>
        </div>
        <div className="flex gap-3 border-t border-line-default p-5"><Button className="flex-1" onClick={() => onEdit(lead)} variant="secondary">Close</Button><Button className="flex-1" leftIcon={<Pencil className="size-4" />} onClick={() => onEdit(lead)}>Edit lead</Button></div>
      </aside>
    </div>
  )
}

function EditLeadModal({ lead, onClose, onSave }) {
  if (!lead) return null

  function handleSubmit(event) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    onSave({ ...lead, name: formData.get('name'), email: formData.get('email'), company: formData.get('company'), status: formData.get('status') })
  }

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-slate-950/30 p-4">
      <div aria-label="Edit lead" className="w-full max-w-lg rounded-card bg-surface-default shadow-overlay" role="dialog">
        <div className="flex items-center justify-between border-b border-line-default p-5"><h2 className="text-base font-semibold text-ink-primary">Edit lead</h2><button aria-label="Close edit lead" className="rounded-control p-1.5 text-ink-muted hover:bg-surface-muted" onClick={onClose} type="button"><X className="size-5" /></button></div>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <label className="space-y-1.5"><span className="text-sm font-medium text-ink-secondary">Full name</span><input className="input" defaultValue={lead.name} name="name" required /></label>
            <label className="space-y-1.5"><span className="text-sm font-medium text-ink-secondary">Company</span><input className="input" defaultValue={lead.company} name="company" required /></label>
            <label className="space-y-1.5 sm:col-span-2"><span className="text-sm font-medium text-ink-secondary">Email</span><input className="input" defaultValue={lead.email} name="email" required type="email" /></label>
            <label className="space-y-1.5"><span className="text-sm font-medium text-ink-secondary">Status</span><select className="input" defaultValue={lead.status} name="status">{statusOptions.slice(1).map((status) => <option key={status}>{status}</option>)}</select></label>
          </div>
          <div className="flex justify-end gap-3 border-t border-line-default p-5"><Button onClick={onClose} type="button" variant="secondary">Cancel</Button><Button type="submit">Save changes</Button></div>
        </form>
      </div>
    </div>
  )
}

function DeleteLeadDialog({ lead, onCancel, onConfirm }) {
  if (!lead) return null

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/30 p-4">
      <div aria-label="Delete lead" className="w-full max-w-sm rounded-card bg-surface-default p-6 shadow-overlay" role="dialog">
        <h2 className="text-base font-semibold text-ink-primary">Delete {lead.name}?</h2>
        <p className="mt-2 text-sm leading-6 text-ink-muted">This will remove the lead from this local view. This action cannot be undone.</p>
        <div className="mt-6 flex justify-end gap-3"><Button onClick={onCancel} variant="secondary">Cancel</Button><Button onClick={() => onConfirm(lead.id)} variant="danger">Delete lead</Button></div>
      </div>
    </div>
  )
}

function LeadsPage() {
  const [leads, setLeads] = useState(initialLeads)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('All statuses')
  const [owner, setOwner] = useState('All owners')
  const [page, setPage] = useState(1)
  const [selectedLead, setSelectedLead] = useState(null)
  const [editingLead, setEditingLead] = useState(null)
  const [leadToDelete, setLeadToDelete] = useState(null)

  const filteredLeads = useMemo(() => leads.filter((lead) => {
    const searchValue = `${lead.name} ${lead.email} ${lead.company}`.toLowerCase()
    return searchValue.includes(query.trim().toLowerCase()) && (status === 'All statuses' || lead.status === status) && (owner === 'All owners' || lead.owner === owner)
  }), [leads, owner, query, status])

  const totalPages = Math.max(1, Math.ceil(filteredLeads.length / pageSize))
  const pageLeads = filteredLeads.slice((page - 1) * pageSize, page * pageSize)

  useEffect(() => setPage(1), [query, status, owner])
  useEffect(() => { if (page > totalPages) setPage(totalPages) }, [page, totalPages])

  function clearFilters() {
    setQuery('')
    setStatus('All statuses')
    setOwner('All owners')
  }

  function saveLead(updatedLead) {
    setLeads((currentLeads) => currentLeads.map((lead) => lead.id === updatedLead.id ? updatedLead : lead))
    setEditingLead(null)
    setSelectedLead(null)
  }

  function deleteLead(id) {
    setLeads((currentLeads) => currentLeads.filter((lead) => lead.id !== id))
    setLeadToDelete(null)
    setSelectedLead(null)
  }

  const columns = [
    { key: 'lead', header: 'Lead', render: (lead) => <div><p className="font-medium text-ink-primary">{lead.name}</p><p className="mt-0.5 text-xs text-ink-muted">{lead.email}</p></div> },
    { key: 'company', header: 'Company', render: (lead) => <span className="text-ink-secondary">{lead.company}</span> },
    { key: 'status', header: 'Status', render: (lead) => <StatusBadge status={lead.status} /> },
    { key: 'score', header: 'Score', cellClassName: 'text-center', headerClassName: 'text-center', render: (lead) => <span className="font-medium text-ink-primary">{lead.score}</span> },
    { key: 'owner', header: 'Owner', render: (lead) => <span className="text-ink-secondary">{lead.owner}</span> },
    { key: 'updated', header: 'Updated', render: (lead) => <span className="whitespace-nowrap text-ink-muted">{lead.updated}</span> },
    {
      key: 'actions', header: <span className="sr-only">Actions</span>, cellClassName: 'w-32', render: (lead) => (
        <div className="flex items-center justify-end gap-1">
          <button aria-label={`View ${lead.name}`} className="rounded-control p-2 text-ink-muted hover:bg-surface-muted hover:text-ink-primary" onClick={() => setSelectedLead(lead)} type="button"><Eye className="size-4" /></button>
          <button aria-label={`Edit ${lead.name}`} className="rounded-control p-2 text-ink-muted hover:bg-surface-muted hover:text-ink-primary" onClick={() => setEditingLead(lead)} type="button"><Pencil className="size-4" /></button>
          <button aria-label={`Delete ${lead.name}`} className="rounded-control p-2 text-ink-muted hover:bg-red-50 hover:text-danger" onClick={() => setLeadToDelete(lead)} type="button"><Trash2 className="size-4" /></button>
        </div>
      ),
    },
  ]

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header>
        <div><p className="text-sm font-medium text-brand-600">Workspace</p><h1 className="mt-1 text-3xl font-semibold tracking-tight text-ink-primary">Leads</h1><p className="mt-2 text-sm text-ink-muted">Manage and qualify your prospect pipeline.</p></div>
      </header>

      <section className="card overflow-hidden p-0">
        <div className="flex flex-col gap-3 border-b border-line-default p-4 lg:flex-row lg:items-center">
          <div className="relative flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted" /><input className="input pl-9" onChange={(event) => setQuery(event.target.value)} placeholder="Search by name, email, or company" value={query} /></div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <label className="relative"><SlidersHorizontal className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted" /><select aria-label="Filter by status" className="input min-w-40 pl-9" onChange={(event) => setStatus(event.target.value)} value={status}>{statusOptions.map((option) => <option key={option}>{option}</option>)}</select></label>
            <select aria-label="Filter by owner" className="input min-w-36" onChange={(event) => setOwner(event.target.value)} value={owner}>{ownerOptions.map((option) => <option key={option}>{option}</option>)}</select>
            {(query || status !== 'All statuses' || owner !== 'All owners') ? <Button onClick={clearFilters} variant="ghost">Clear</Button> : null}
          </div>
        </div>
        <DataTable columns={columns} data={pageLeads} getRowId={(lead) => lead.id} />
        <Pagination currentPage={page} onPageChange={setPage} pageSize={pageSize} totalItems={filteredLeads.length} />
      </section>

      <LeadDetails lead={selectedLead} onClose={() => setSelectedLead(null)} onEdit={(lead) => { setSelectedLead(null); setEditingLead(lead) }} />
      <EditLeadModal lead={editingLead} onClose={() => setEditingLead(null)} onSave={saveLead} />
      <DeleteLeadDialog lead={leadToDelete} onCancel={() => setLeadToDelete(null)} onConfirm={deleteLead} />
    </div>
  )
}

export default LeadsPage
