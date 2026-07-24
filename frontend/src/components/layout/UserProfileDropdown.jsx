import { useEffect, useRef, useState } from 'react'
import { NavLink } from 'react-router-dom'

import { ChevronDown, LogOut, Settings, User } from '@/components/ui/icons'

function UserProfileDropdown() {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    function closeOnOutsideClick(event) {
      if (!menuRef.current?.contains(event.target)) {
        setIsOpen(false)
      }
    }

    function closeOnEscape(event) {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)

    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [])

  return (
    <div className="relative" ref={menuRef}>
      <button
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label="Open user menu"
        className="flex items-center gap-2 rounded-control p-1.5 text-left transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-focus"
        onClick={() => setIsOpen((open) => !open)}
        type="button"
      >
        <span className="grid size-7 place-items-center rounded-full bg-slate-900 text-xs font-semibold text-white">SM</span>
        <ChevronDown className="hidden size-4 text-ink-muted sm:block" />
      </button>

      {isOpen ? (
        <div aria-label="User menu" className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-60 rounded-card border border-line-default bg-surface-default p-1.5 shadow-floating" role="menu">
          <div className="border-b border-line-default px-3 py-2.5">
            <p className="text-sm font-medium text-ink-primary">Sales Team</p>
            <p className="mt-0.5 truncate text-xs text-ink-muted">team@salesgenie.ai</p>
          </div>
          <div className="py-1">
            <NavLink className="flex w-full items-center gap-2.5 rounded-control px-3 py-2 text-sm text-ink-secondary hover:bg-surface-muted hover:text-ink-primary" onClick={() => setIsOpen(false)} role="menuitem" to="/profile">
              <User className="size-4" />
              Profile
            </NavLink>
            <NavLink className="flex w-full items-center gap-2.5 rounded-control px-3 py-2 text-sm text-ink-secondary hover:bg-surface-muted hover:text-ink-primary" onClick={() => setIsOpen(false)} role="menuitem" to="/settings">
              <Settings className="size-4" />
              Account settings
            </NavLink>
          </div>
          <div className="border-t border-line-default pt-1">
            <button className="flex w-full items-center gap-2.5 rounded-control px-3 py-2 text-sm text-danger hover:bg-red-50" role="menuitem" type="button">
              <LogOut className="size-4" />
              Sign out
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default UserProfileDropdown
