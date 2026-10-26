import { Link, useLocation } from 'react-router-dom'

type SiteHeaderProps = {
  overlay?: boolean
}

export function SiteHeader({ overlay = false }: SiteHeaderProps) {
  const { pathname } = useLocation()

  return (
    <header className={overlay ? 'site-header site-header-overlay' : 'site-header'}>
      <Link to="/" className="wordmark" aria-current={pathname === '/' ? 'page' : undefined}>
        Queen's Range
      </Link>
      <nav aria-label="Pages">
        <Link
          to="/method"
          className="method-link"
          aria-current={pathname === '/method' ? 'page' : undefined}
        >
          How it works
        </Link>
      </nav>
    </header>
  )
}
