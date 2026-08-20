import { Fragment } from 'react'
import { useLocation } from 'react-router-dom'

import { ChevronRight } from '@/components/ui/icons'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function formatSegment(segment) {
  const decoded = decodeURIComponent(segment)
  // Truncate UUID-like segments for readability
  if (UUID_RE.test(decoded)) {
    return { label: `${decoded.slice(0, 8)}…`, full: decoded }
  }
  const label = decoded
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
  return { label, full: null }
}

function Breadcrumb() {
  const { pathname } = useLocation()
  const segments = pathname.split('/').filter(Boolean)
  const items = [{ label: 'Home', full: null }, ...segments.map(formatSegment)]

  return (
    <nav aria-label="Breadcrumb" className="min-w-0">
      <ol className="flex min-w-0 items-center gap-1.5 text-sm">
        {items.map((item, index) => {
          const isCurrent = index === items.length - 1

          return (
            <Fragment key={`${item.label}-${index}`}>
              {index > 0 ? <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-ink-disabled" /> : null}
              <li
                className={
                  isCurrent
                    ? 'max-w-[180px] truncate font-medium text-ink-primary sm:max-w-[260px]'
                    : 'hidden shrink-0 text-ink-muted sm:block'
                }
                aria-current={isCurrent ? 'page' : undefined}
                title={item.full || undefined}
              >
                {item.label}
              </li>
            </Fragment>
          )
        })}
      </ol>
    </nav>
  )
}

export default Breadcrumb
