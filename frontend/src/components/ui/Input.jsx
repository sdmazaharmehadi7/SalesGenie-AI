import { forwardRef, useId } from 'react'

const Input = forwardRef(function Input(
  { className = '', error, hint, id, label, ...props },
  ref,
) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const hintId = hint ? `${inputId}-hint` : undefined
  const errorId = error ? `${inputId}-error` : undefined
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined

  return (
    <div className="space-y-1.5">
      {label ? (
        <label className="block text-sm font-medium text-ink-secondary" htmlFor={inputId}>
          {label}
        </label>
      ) : null}
      <input
        aria-describedby={describedBy}
        aria-invalid={Boolean(error)}
        className={['input', className].filter(Boolean).join(' ')}
        id={inputId}
        ref={ref}
        {...props}
      />
      {hint ? <p className="text-xs text-ink-muted" id={hintId}>{hint}</p> : null}
      {error ? <p className="text-xs text-danger" id={errorId}>{error}</p> : null}
    </div>
  )
})

export default Input
