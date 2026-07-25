function Card({ children, className = '', variant = 'default', ...props }) {
  const variantClass = {
    default: 'card',
    interactive: 'card-interactive',
    elevated: 'card-elevated',
  }[variant]

  return (
    <section className={[variantClass, className].filter(Boolean).join(' ')} {...props}>
      {children}
    </section>
  )
}

function CardHeader({ children, className = '' }) {
  return <div className={['mb-5 space-y-1', className].filter(Boolean).join(' ')}>{children}</div>
}

function CardTitle({ children, className = '' }) {
  return <h2 className={['text-base font-semibold text-ink-primary', className].filter(Boolean).join(' ')}>{children}</h2>
}

function CardDescription({ children, className = '' }) {
  return <p className={['text-sm text-ink-muted', className].filter(Boolean).join(' ')}>{children}</p>
}

function CardContent({ children, className = '' }) {
  return <div className={className}>{children}</div>
}

function CardFooter({ children, className = '' }) {
  return <div className={['mt-5 flex items-center gap-3', className].filter(Boolean).join(' ')}>{children}</div>
}

export { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle }
