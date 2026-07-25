export function LeadSkeleton() {
  return (
    <div className="card space-y-4 animate-pulse">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="size-11 rounded-full bg-slate-200" />
          <div className="space-y-2">
            <div className="h-4 w-36 rounded bg-slate-200" />
            <div className="h-3 w-48 rounded bg-slate-200" />
          </div>
        </div>
        <div className="h-7 w-20 rounded-full bg-slate-200" />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 pt-2">
        <div className="h-12 rounded bg-slate-100" />
        <div className="h-12 rounded bg-slate-100" />
        <div className="h-12 rounded bg-slate-100" />
        <div className="h-12 rounded bg-slate-100" />
      </div>

      <div className="rounded-card bg-slate-100 p-4 space-y-3">
        <div className="h-4 w-32 rounded bg-slate-200" />
        <div className="h-3 w-full rounded bg-slate-200" />
        <div className="h-3 w-4/5 rounded bg-slate-200" />
      </div>

      <div className="flex gap-2 pt-2 border-t border-line-default">
        <div className="h-8 flex-1 rounded bg-slate-200" />
        <div className="h-8 flex-1 rounded bg-slate-200" />
        <div className="h-8 flex-1 rounded bg-slate-200" />
        <div className="h-8 flex-1 rounded bg-slate-200" />
      </div>
    </div>
  )
}
