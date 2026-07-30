// Visual config for the `InteractionType` enum returned by the backend
// (`call | email | meeting | demo | other` — see
// `app/models/pipeline_enums.py`). Replaces the old mock sentiment config;
// interaction type is the only categorical field the API actually returns
// per summary.
export const INTERACTION_TYPES = {
  call: {
    label: 'Call',
    color: 'bg-brand-50 text-brand-700 ring-brand-100',
    dot: 'bg-brand-500',
  },
  email: {
    label: 'Email',
    color: 'bg-slate-100 text-slate-600 ring-slate-200',
    dot: 'bg-slate-400',
  },
  meeting: {
    label: 'Meeting',
    color: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    dot: 'bg-emerald-500',
  },
  demo: {
    label: 'Demo',
    color: 'bg-violet-50 text-violet-700 ring-violet-100',
    dot: 'bg-violet-500',
  },
  other: {
    label: 'Other',
    color: 'bg-amber-50 text-amber-700 ring-amber-100',
    dot: 'bg-amber-500',
  },
}

export const DATE_OPTIONS = ['All Time', 'Last 7 Days', 'Last 30 Days', 'Last 90 Days']
