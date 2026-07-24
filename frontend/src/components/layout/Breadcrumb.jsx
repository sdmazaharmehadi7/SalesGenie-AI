import { Fragment } from 'react'
import { useLocation } from 'react-router-dom'

import { ChevronRight } from '@/components/ui/icons'

function formatSegment(segment) {
  return decodeURIComponent(segment)
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function Breadcrumb() {
  const { pathname } = useLocation()
  const segments = pathname.split('/').filter(Boolean)
  const items = ['Home', ...segments.map(formatSegment)]

  return (
    <nav aria-label="Breadcrumb" className="min-w-0">
      <ol className="flex min-w-0 items-center gap-1.5 text-sm">
        {items.map((item, index) => {
          const isCurrent = index === items.length - 1

          return (
            <Fragment key={`${item}-${index}`}>
              {index > 0 ? <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-ink-disabled" /> : null}
              <li className={isCurrent ? 'truncate font-medium text-ink-primary' : 'hidden text-ink-muted sm:block'} aria-current={isCurrent ? 'page' : undefined}>
                {item}
              </li>
            </Fragment>
          )
        })}
      </ol>
    </nav>
  )
}

export default Breadcrumb
