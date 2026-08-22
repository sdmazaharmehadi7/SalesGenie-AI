import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'

/**
 * Resets the scroll position to the top whenever the route pathname changes.
 *
 * This component is mounted as the root layout route in `frontend/src/routes`
 * (createBrowserRouter + RouterProvider), so it wraps every page in the app.
 * It renders <Outlet /> for the nested route content.
 *
 * Scroll behavior:
 *  - The authenticated Layout scrolls inside <main id="main-content">, so we
 *    reset both that container and the window viewport to (0, 0).
 *  - Anchor links (e.g. path#section) are left untouched: if the new location
 *    contains a hash, the native anchor scrolling is preserved and we skip the
 *    reset.
 */
function ScrollToTop() {
  const { pathname, hash } = useLocation()

  useEffect(() => {
    // Prevent the browser from restoring a previous scroll position on reload
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual'
    }
  }, [])

  useEffect(() => {
    if (hash) return

    // Reset the viewport (used by auth pages and any window-scrolling pages)
    window.scrollTo(0, 0)

    // Reset the app's main scroll container (authenticated layout)
    document.getElementById('main-content')?.scrollTo(0, 0)
  }, [pathname, hash])

  return <Outlet />
}

export default ScrollToTop