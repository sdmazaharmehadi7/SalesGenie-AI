import { Bell, Menu } from '@/components/ui/icons'
import Breadcrumb from '@/components/layout/Breadcrumb'
import UserProfileDropdown from '@/components/layout/UserProfileDropdown'

function TopNavbar({ onMenuClick }) {
  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b border-line-default bg-surface-default/95 px-4 backdrop-blur sm:px-6">
      <button
        aria-label="Open navigation"
        className="rounded-control p-2 text-ink-secondary transition-colors hover:bg-surface-muted hover:text-ink-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-focus md:hidden"
        onClick={onMenuClick}
        type="button"
      >
        <Menu className="size-5" />
      </button>

      <Breadcrumb />

      <div className="ml-auto flex items-center gap-1.5">
        <button
          aria-label="View notifications"
          className="relative rounded-control p-2 text-ink-secondary transition-colors hover:bg-surface-muted hover:text-ink-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-focus"
          type="button"
        >
          <Bell className="size-5" strokeWidth={1.8} />
          <span className="absolute right-2 top-2 size-1.5 rounded-full bg-brand-500 ring-2 ring-surface-default" />
        </button>
        <UserProfileDropdown />
      </div>
    </header>
  )
}

export default TopNavbar
