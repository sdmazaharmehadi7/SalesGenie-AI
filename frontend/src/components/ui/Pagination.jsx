import { ChevronLeft, ChevronRight } from '@/components/ui/icons'

function Pagination({ currentPage, onPageChange, pageSize, totalItems }) {
  const pageCount = Math.max(1, Math.ceil(totalItems / pageSize))
  const firstItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1
  const lastItem = Math.min(currentPage * pageSize, totalItems)

  return (
    <div className="flex flex-col gap-3 border-t border-line-default px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-ink-muted">Showing {firstItem}–{lastItem} of {totalItems} leads</p>
      <div className="flex items-center gap-2">
        <button
          aria-label="Previous page"
          className="inline-flex size-8 items-center justify-center rounded-control border border-line-default text-ink-secondary transition-colors hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50"
          disabled={currentPage === 1}
          onClick={() => onPageChange(currentPage - 1)}
          type="button"
        >
          <ChevronLeft className="size-4" />
        </button>
        <span className="min-w-16 text-center text-sm text-ink-secondary">Page {currentPage} of {pageCount}</span>
        <button
          aria-label="Next page"
          className="inline-flex size-8 items-center justify-center rounded-control border border-line-default text-ink-secondary transition-colors hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50"
          disabled={currentPage === pageCount}
          onClick={() => onPageChange(currentPage + 1)}
          type="button"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
    </div>
  )
}

export default Pagination
