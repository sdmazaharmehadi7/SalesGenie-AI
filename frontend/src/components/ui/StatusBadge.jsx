const statusClasses = {
  New: 'bg-brand-50 text-brand-700 ring-brand-100',
  Contacted: 'bg-slate-100 text-slate-700 ring-slate-200',
  Qualified: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  Nurturing: 'bg-amber-50 text-amber-700 ring-amber-100',
}

function StatusBadge({ status }) {
  return (
    <span className={['inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset', statusClasses[status] ?? 'bg-slate-100 text-slate-700 ring-slate-200'].join(' ')}>
      {status}
    </span>
  )
}

export default StatusBadge
