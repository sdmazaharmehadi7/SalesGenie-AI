import { Menu } from '@/components/ui/icons'
import Breadcrumb from '@/components/layout/Breadcrumb'
import NotificationDropdown from '@/components/layout/NotificationDropdown'
import UserProfileDropdown from '@/components/layout/UserProfileDropdown'
import WorkspaceContextSwitcher from '@/components/layout/WorkspaceContextSwitcher'

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

      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        {/* Workspace context switcher in top navbar */}
        <WorkspaceContextSwitcher inNavbar />

        {/* Notifications dropdown */}
        <NotificationDropdown />

        <UserProfileDropdown />
      </div>
    </header>
  )
}

export default TopNavbar
