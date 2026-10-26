import { Link, useLocation } from 'react-router-dom'

export function SiteHeader() {
  const { pathname } = useLocation()

  return (
    <header className="site-header">
      <Link to="/" className="wordmark" aria-current={pathname === '/' ? 'page' : undefined}>
        Eight games.
      </Link>
      <nav aria-label="Pages">
        <Link
          to="/method"
          className="method-link"
          aria-current={pathname === '/method' ? 'page' : undefined}
        >
          Method
        </Link>
      </nav>
    </header>
  )
}
