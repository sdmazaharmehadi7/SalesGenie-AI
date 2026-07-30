import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'

/**
 * ToastContext — global, non-blocking notification system.
 *
 * Usage:
 *   const { showToast } = useToast()
 *   showToast('Lead created!', 'success')
 *   showToast('Something went wrong.', 'error')
 */
const ToastContext = createContext(null)

const DURATION_MS = 3500

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const idRef = useRef(0)

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const showToast = useCallback(
    (message, type = 'success') => {
      const id = ++idRef.current
      setToasts((prev) => [...prev, { id, message, type }])
      setTimeout(() => removeToast(id), DURATION_MS)
    },
    [removeToast],
  )

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      {/* Toast container — fixed top-center */}
      <div
        aria-live="polite"
        className="fixed top-5 left-1/2 z-[9999] flex -translate-x-1/2 flex-col items-center gap-2"
        role="region"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={[
              'flex items-center gap-2.5 rounded-card px-4 py-2.5 text-sm font-medium shadow-floating transition-all',
              toast.type === 'error'
                ? 'bg-rose-600 text-white'
                : toast.type === 'warning'
                  ? 'bg-amber-500 text-white'
                  : 'bg-surface-inverse text-ink-inverse',
            ].join(' ')}
            role="alert"
          >
            {toast.type === 'error' && (
              <svg className="size-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
            {toast.type === 'success' && (
              <svg className="size-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
            <span>{toast.message}</span>
            <button
              aria-label="Dismiss"
              className="ml-1 rounded-full opacity-70 hover:opacity-100"
              onClick={() => removeToast(toast.id)}
              type="button"
            >
              <svg className="size-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

/** Hook to consume ToastContext. */
export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>')
  return ctx
}
