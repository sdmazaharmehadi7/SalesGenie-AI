function PagePlaceholder({ description, title }) {
  return (
    <section className="flex min-h-[calc(100vh-10rem)] items-center justify-center" aria-labelledby="page-title">
      <div className="max-w-md text-center">
        <p className="text-sm font-medium text-brand-600">SalesGenie</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink-primary" id="page-title">
          {title}
        </h1>
        <p className="mt-3 text-sm leading-6 text-ink-muted">{description}</p>
      </div>
    </section>
  )
}

export default PagePlaceholder
