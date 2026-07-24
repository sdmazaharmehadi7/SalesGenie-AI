import { NavLink } from 'react-router-dom'

import { ChevronLeft, X } from '@/components/ui/icons'
import { primaryNavigation, secondaryNavigation } from '@/components/layout/navigation'

function NavigationItem({ isCollapsed, item, onClick }) {
  const Icon = item.icon

  return (
    <NavLink
      className={({ isActive }) =>
        [
          'group flex w-full items-center gap-3 rounded-control px-3 py-2.5 text-left text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-focus',
          isActive
            ? 'bg-brand-50 text-brand-700'
            : 'text-ink-secondary hover:bg-surface-muted hover:text-ink-primary',
        ].join(' ')
      }
      onClick={onClick}
      to={item.to}
      title={isCollapsed ? item.label : undefined}
    >
      <Icon aria-hidden="true" className="size-5 shrink-0" strokeWidth={1.75} />
      <span className={isCollapsed ? 'sr-only' : 'truncate'}>{item.label}</span>
    </NavLink>
  )
}

function SidebarContent({ isCollapsed, onClose }) {
  return (
    <>
      <div className="flex h-16 items-center border-b border-line-default px-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="grid size-8 shrink-0 place-items-center rounded-control bg-brand-600 text-sm font-bold text-ink-inverse">
            S
          </span>
          <span className={isCollapsed ? 'sr-only' : 'truncate text-sm font-semibold tracking-tight text-ink-primary'}>
            SalesGenie
          </span>
        </div>
        <button
          aria-label="Close navigation"
          className="ml-auto rounded-control p-2 text-ink-muted hover:bg-surface-muted hover:text-ink-primary md:hidden"
          onClick={onClose}
          type="button"
        >
          <X className="size-5" />
        </button>
      </div>

      <nav aria-label="Primary navigation" className="flex flex-1 flex-col gap-1 p-3">
        {primaryNavigation.map((item) => (
          <NavigationItem isCollapsed={isCollapsed} item={item} key={item.label} onClick={onClose} />
        ))}
        <div className="my-3 border-t border-line-default" />
        {secondaryNavigation.map((item) => (
          <NavigationItem isCollapsed={isCollapsed} item={item} key={item.label} onClick={onClose} />
        ))}
      </nav>
    </>
  )
}

function Sidebar({ isCollapsed, isMobileOpen, onCollapse, onMobileClose }) {
  return (
    <>
      <aside
        className={`hidden h-screen shrink-0 flex-col border-r border-line-default bg-surface-default transition-[width] duration-200 md:flex ${
          isCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        <SidebarContent isCollapsed={isCollapsed} />
        <div className="border-t border-line-default p-3">
          <button
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="flex w-full items-center justify-center rounded-control p-2 text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-focus"
            onClick={onCollapse}
            type="button"
          >
            <ChevronLeft className={`size-5 transition-transform ${isCollapsed ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </aside>

      <div className={`fixed inset-0 z-40 md:hidden ${isMobileOpen ? '' : 'pointer-events-none'}`}>
        <button
          aria-label="Close navigation"
          className={`absolute inset-0 bg-slate-950/30 transition-opacity ${isMobileOpen ? 'opacity-100' : 'opacity-0'}`}
          onClick={onMobileClose}
          tabIndex={isMobileOpen ? 0 : -1}
          type="button"
        />
        <aside
          aria-label="Mobile navigation"
          className={`relative flex h-full w-72 flex-col bg-surface-default shadow-overlay transition-transform duration-200 ${
            isMobileOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <SidebarContent isCollapsed={false} onClose={onMobileClose} />
        </aside>
      </div>
    </>
  )
}

export default Sidebar
