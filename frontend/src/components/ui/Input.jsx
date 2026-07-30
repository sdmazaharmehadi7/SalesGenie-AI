import { forwardRef, useId, useState } from 'react'
import { Eye, EyeOff } from '@/components/ui/icons'

const Input = forwardRef(function Input(
  { className = '', error, hint, id, label, type, ...props },
  ref,
) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const hintId = hint ? `${inputId}-hint` : undefined
  const errorId = error ? `${inputId}-error` : undefined
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined

  const [showPassword, setShowPassword] = useState(false)
  const isPasswordType = type === 'password'
  const computedType = isPasswordType ? (showPassword ? 'text' : 'password') : type

  return (
    <div className="space-y-1.5">
      {label ? (
        <label className="block text-sm font-medium text-ink-secondary" htmlFor={inputId}>
          {label}
        </label>
      ) : null}
      <div className="relative">
        <input
          aria-describedby={describedBy}
          aria-invalid={Boolean(error)}
          className={['input', isPasswordType ? 'pr-10' : '', className].filter(Boolean).join(' ')}
          id={inputId}
          ref={ref}
          type={computedType}
          {...props}
        />
        {isPasswordType ? (
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-control p-1 text-ink-muted hover:text-ink-primary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        ) : null}
      </div>
      {hint ? <p className="text-xs text-ink-muted" id={hintId}>{hint}</p> : null}
      {error ? <p className="text-xs text-danger" id={errorId}>{error}</p> : null}
    </div>
  )
})

export default Input
